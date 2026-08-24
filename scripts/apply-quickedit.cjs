// Re-apply 3.2 quick-edit changes to StudentsListPage (restored from HEAD).
// Steps: imports, dead code removal, form types, guardian payload type,
// slideout -> EntityForm, new memo + handler. Anchors verified before each edit.
const fs = require('fs');
const rel = 'src/modules/administration/pages/StudentsListPage.tsx';
let src = fs.readFileSync(rel, 'utf8');
const steps = [];

function must(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } steps.push(msg); }

// 1. EntityForm import
must(src.includes("import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';"), 'tabbedform import');
src = src.replace(
  "import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';",
  "import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';\nimport { EntityForm, EntityFieldConfig } from '@/components/ui/forms';"
);

// 2. Remove unused Spinner import
src = src.replace(/import Spinner from '@\/components\/ui\/Spinner';\r?\n/, '');

// 3. Widen StudentFormData dropdown id types
src = src.replace(
  "  current_class_stream_id?: number;\n  student_category_id?: number;\n  dormitory_id?: number;",
  "  current_class_stream_id?: number | null;\n  student_category_id?: number | null;\n  dormitory_id?: number | null;"
);

// 4. Guardian payload type (ParentGuardian symbol does not exist here)
src = src.replace(
  "let guardianPayload: (Omit<ParentGuardian, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {relationship_type: string, id?: string}) | undefined = undefined;",
  "let guardianPayload: { name: string; phone?: string; relationship_type: string; id?: string } | undefined = undefined;"
);

// 5. Remove unused handleInputChange
src = src.replace(
  /  const handleInputChange = \(name: string, value: any\) => \{\r?\n    setFormData\(prev => \(\{ \.\.\.prev, \[name\]: value \}\)\);\r?\n  \};\r?\n\r?\n/,
  ''
);

// 6. Fix full-edit updateStudent arity + drop the as-any second arg
src = src.replace(
  'await updateStudent(studentToUpdate, guardianPayload as any); // Type assertion for mock fn',
  'await updateStudent(String(editingStudent.id), studentToUpdate, guardianPayload);'
);

// 7. Replace the hand-rolled slideout block with an EntityForm-driven one.
const start = src.indexOf('      {/* Quick Edit Slideout - Simplified approach */}');
must(start !== -1, 'slideout start anchor');
const endMarker = '      {/* Quick Edit Configuration Modal */}';
const end = src.indexOf(endMarker);
must(end !== -1 && end > start, 'config-modal end anchor');

const replacement = [
'      {/* Quick Edit - EntityForm driven by a student-specific field set (3.2). */}',
'      {/* The former generic config shapes never matched real Student columns. */}',
'      {quickEditStudent && (',
'        <EntityForm',
'          isOpen',
'          onClose={() => setQuickEditStudent(null)}',
"          title={'Quick Edit — ' + (quickEditStudent.display_name || [quickEditStudent.first_name, quickEditStudent.last_name].filter(Boolean).join(' ') || quickEditStudent.admission_no)}",
'          description={quickEditStudent.admission_no}',
'          initialData={{',
"            first_name: quickEditStudent.first_name || '',",
"            last_name: quickEditStudent.last_name || '',",
"            current_class_stream_id: quickEditStudent.current_class_stream_id != null ? String(quickEditStudent.current_class_stream_id) : '',",
"            status: quickEditStudent.status || '',",
'          }}',
'          fields={quickEditFields}',
'          onSubmit={handleQuickEditSave}',
'        >',
'          <div className="flex justify-between items-center mt-2">',
'            <Button',
'              variant="ghost"',
'              size="sm"',
'              onClick={() => {',
'                const studentData = quickEditStudent;',
'                setQuickEditStudent(null);',
'                setTimeout(() => openModal(studentData), 200);',
'              }}',
'            >',
'              Full Edit',
'            </Button>',
'          </div>',
'        </EntityForm>',
'      )}',
'',
].join('\n');

src = src.slice(0, start) + replacement + '\n' + src.slice(end);

fs.writeFileSync(rel, src, 'utf8');
console.log('Applied:\n' + steps.join('\n'));
