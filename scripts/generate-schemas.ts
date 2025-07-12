/**
 * ABOUTME: This script generates RxDB schemas from our "North Star" types.
 * ABOUTME: It reads `src/core/backend-types.ts` and outputs a staged schema file.
 */
import { Project, InterfaceDeclaration, PropertySignature, ts, Type } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// =================================================================================
// TYPE DEFINITIONS FOR THE GENERATOR
// =================================================================================

interface RxDBPropertyDefinition {
    type: string | string[];
    format?: 'date-time';
    enum?: string[];
    ref?: string;
    items?: RxDBPropertyDefinition;
}

interface RxDBSchema {
    title: string;
    version: number;
    description: string;
    primaryKey: string;
    type: 'object';
    properties: Record<string, RxDBPropertyDefinition>;
    required: string[];
    indexes: string[];
}

// =================================================================================
// SETUP & CONFIGURATION
// =================================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
});

const sourceFilePath = path.resolve(__dirname, '../src/core/backend-types.ts');
const generatedDirPath = path.resolve(__dirname, '../src/core');
const schemaOutputFilePath = path.resolve(generatedDirPath, 'gn-rxdb-schemas.ts');

const sourceFile = project.addSourceFileAtPath(sourceFilePath);

const generatedSchemas: Record<string, RxDBSchema> = {};

// =================================================================================
// CORE LOGIC
// =================================================================================

function mapTsTypeToJsonSchema(type: Type): RxDBPropertyDefinition {
    if (type.isString() || type.getText().includes('Brand<string')) { return { type: 'string' }; }
    if (type.isNumber()) { return { type: 'number' }; }
    if (type.isBoolean()) { return { type: 'boolean' }; }
    if (type.getText() === 'Date') { return { type: 'string', format: 'date-time' }; }
    if (type.isUnion()) {
        const nonNullTypes = type.getUnionTypes().filter(t => !t.isNull());
        if (nonNullTypes.length === 1) {
            const definition = mapTsTypeToJsonSchema(nonNullTypes[0]);
            return { ...definition, type: [definition.type as string, 'null'] };
        }
        if (nonNullTypes.every(t => t.isStringLiteral())) {
            const enumValues = nonNullTypes.map(t => t.getLiteralValue() as string);
            return { type: 'string', enum: enumValues };
        }
    }
    if (type.isArray()) {
        const arrayType = type.getArrayElementTypeOrThrow();
        return { type: 'array', items: mapTsTypeToJsonSchema(arrayType) };
    }
    return { type: 'object' };
}

function generateSchemaForInterface(interfaceDecl: InterfaceDeclaration) {
    const interfaceName = interfaceDecl.getName();
    const collectionName = interfaceName.toLowerCase();
    
    const properties: Record<string, RxDBPropertyDefinition> = {};
    const required: string[] = [];
    const indexes: string[] = ['updated_at'];
    const allProperties: PropertySignature[] = [...interfaceDecl.getProperties()];
    interfaceDecl.getExtends().forEach(heritageClause => {
        const extendedInterface = heritageClause.getType().getSymbol()?.getDeclarations()[0] as InterfaceDeclaration;
        if (extendedInterface) {
            allProperties.push(...extendedInterface.getProperties());
        }
    });
    for (const prop of allProperties) {
        const propName = prop.getName();
        if (propName === '__brand') continue;
        const propType = prop.getType();
        properties[propName] = mapTsTypeToJsonSchema(propType);
        const hasQuestionToken = prop.hasQuestionToken();
        const isNullable = propType.isUnion() && propType.getUnionTypes().some(t => t.isNull());
        if (!hasQuestionToken && !isNullable) {
            required.push(propName);
        }
        if (propName.endsWith('_id') && propName !== 'id') {
            indexes.push(propName);
        }
    }
    generatedSchemas[collectionName] = {
        title: `${interfaceName} schema`, version: 0, description: `Describes a ${interfaceName} entity`,
        primaryKey: 'id', type: 'object', properties, required, indexes: [...new Set(indexes)],
    };
}

function generateAllRxDbSchemas() {
    console.log('🔄 Generating RxDB Schemas...');
    const entityInterfaces = sourceFile.getInterfaces().filter(i => i.getName() !== 'BaseModel' && !i.getName().startsWith('Report'));
    entityInterfaces.forEach(generateSchemaForInterface);
    console.log(`✅ Generated ${Object.keys(generatedSchemas).length} schemas.`);
}

function saveSchemasToFile() {
    console.log(`\n💾 Saving schemas to: ${schemaOutputFilePath}`);
    if (!fs.existsSync(generatedDirPath)) {
        fs.mkdirSync(generatedDirPath, { recursive: true });
    }
    const fileContent = `/**
 * This file is auto-generated by the script 'scripts/generate-schemas.ts'.
 * Do not edit this file manually.
 */
/* eslint-disable */
import { RxJsonSchema } from 'rxdb';
import * as T from './backend-types';

${Object.entries(generatedSchemas).map(([name, schema]) => {
    const interfaceName = sourceFile.getInterfaces().find(i => i.getName().toLowerCase() === name)?.getName() || 'any';
    return `export const ${name}Schema: RxJsonSchema<T.${interfaceName}> = ${JSON.stringify(schema, null, 4)};`;
}).join('\n\n')}
`;
    fs.writeFileSync(schemaOutputFilePath, fileContent);
    console.log('✅ Schemas saved successfully.');
}

// =================================================================================
// MAIN EXECUTION
// =================================================================================

function main() {
    console.log('🚀 Starting schema generator...');
    console.log(`Reading "North Star" types from: ${sourceFilePath}`);

    generateAllRxDbSchemas();
    saveSchemasToFile();

    console.log('\n🎉 Schema generator script finished successfully!');
}

main(); 