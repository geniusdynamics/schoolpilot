"use strict";
// ABOUTME: Base class for all data generators with common utilities
// ABOUTME: Provides shared functionality for realistic data generation
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseGenerator = void 0;
class BaseGenerator {
    config;
    faker; // Will be dynamically imported
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        // Dynamically import faker for realistic data generation
        try {
            const { faker } = await Promise.resolve().then(() => require('@faker-js/faker'));
            this.faker = faker;
            // Set locale if specified in config
            if (this.config.locale) {
                this.faker.setLocale(this.config.locale);
            }
        }
        catch (error) {
            console.warn('Faker.js not available, using basic data generation');
            this.faker = this.createBasicFaker();
        }
    }
    generateId(prefix = 'gen', index) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const indexStr = index !== undefined ? `_${index.toString().padStart(6, '0')}` : '';
        return `${prefix}_${timestamp}_${random}${indexStr}`;
    }
    generateTimestamp(daysAgo = 0) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    }
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    randomChoices(array, count) {
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(this.randomChoice(array));
        }
        return result;
    }
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    randomFloat(min, max, decimals = 2) {
        const value = Math.random() * (max - min) + min;
        return parseFloat(value.toFixed(decimals));
    }
    randomBoolean(probability = 0.5) {
        return Math.random() < probability;
    }
    randomDate(startDate, endDate) {
        const start = startDate.getTime();
        const end = endDate.getTime();
        return new Date(start + Math.random() * (end - start));
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    generatePhoneNumber() {
        if (this.faker?.phone?.number) {
            return this.faker.phone.number();
        }
        // Fallback phone number generation
        const formats = [
            '+254 7## ### ###',
            '+254 1## ### ###',
            '07## ### ###',
            '01## ### ###'
        ];
        const format = this.randomChoice(formats);
        return format.replace(/#/g, () => Math.floor(Math.random() * 10).toString());
    }
    generateEmail(firstName, lastName, domain) {
        if (this.faker?.internet?.email) {
            return this.faker.internet.email(firstName, lastName, domain);
        }
        // Fallback email generation
        const domains = domain ? [domain] : ['gmail.com', 'yahoo.com', 'outlook.com', 'school.edu'];
        const selectedDomain = this.randomChoice(domains);
        const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        return `${username}@${selectedDomain}`;
    }
    generateName(gender) {
        if (this.faker?.person) {
            return {
                first: this.faker.person.firstName(gender),
                last: this.faker.person.lastName(),
                middle: this.randomBoolean(0.3) ? this.faker.person.firstName(gender) : undefined
            };
        }
        // Fallback name generation
        const maleNames = ['John', 'James', 'Michael', 'David', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher'];
        const femaleNames = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        const firstNames = gender === 'male' ? maleNames : gender === 'female' ? femaleNames : [...maleNames, ...femaleNames];
        return {
            first: this.randomChoice(firstNames),
            last: this.randomChoice(lastNames),
            middle: this.randomBoolean(0.3) ? this.randomChoice(firstNames) : undefined
        };
    }
    generateAddress() {
        if (this.faker?.location?.streetAddress) {
            return `${this.faker.location.streetAddress()}, ${this.faker.location.city()}`;
        }
        // Fallback address generation
        const streets = ['Main St', 'Oak Ave', 'Park Rd', 'Church St', 'School Rd', 'Market St'];
        const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'];
        return `${this.randomInt(1, 999)} ${this.randomChoice(streets)}, ${this.randomChoice(cities)}`;
    }
    generateCompanyName() {
        if (this.faker?.company?.name) {
            return this.faker.company.name();
        }
        // Fallback company name generation
        const prefixes = ['Global', 'United', 'International', 'National', 'Royal', 'Premier'];
        const suffixes = ['Ltd', 'Inc', 'Corp', 'Group', 'Holdings', 'Enterprises'];
        const industries = ['Trading', 'Services', 'Solutions', 'Systems', 'Technologies', 'Industries'];
        return `${this.randomChoice(prefixes)} ${this.randomChoice(industries)} ${this.randomChoice(suffixes)}`;
    }
    generateText(minWords = 5, maxWords = 15) {
        if (this.faker?.lorem?.words) {
            return this.faker.lorem.words(this.randomInt(minWords, maxWords));
        }
        // Fallback text generation
        const words = [
            'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
            'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
            'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud'
        ];
        const wordCount = this.randomInt(minWords, maxWords);
        return this.randomChoices(words, wordCount).join(' ');
    }
    createBasicFaker() {
        // Basic faker implementation for fallback
        const maleNames = ['John', 'James', 'Michael', 'David', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher'];
        const femaleNames = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'];
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'school.edu'];
        return {
            person: {
                firstName: (gender) => {
                    const firstNames = gender === 'male' ? maleNames : gender === 'female' ? femaleNames : [...maleNames, ...femaleNames];
                    return this.randomChoice(firstNames);
                },
                lastName: () => this.randomChoice(lastNames)
            },
            internet: {
                email: (first, last, domain) => {
                    const selectedDomain = domain || this.randomChoice(domains);
                    const username = `${first.toLowerCase()}.${last.toLowerCase()}`;
                    return `${username}@${selectedDomain}`;
                }
            },
            phone: {
                number: () => {
                    const formats = ['+254 7## ### ###', '+254 1## ### ###', '07## ### ###', '01## ### ###'];
                    const format = this.randomChoice(formats);
                    return format.replace(/#/g, () => Math.floor(Math.random() * 10).toString());
                }
            },
            location: {
                streetAddress: () => `${this.randomInt(1, 999)} Main St`,
                city: () => this.randomChoice(cities)
            },
            company: {
                name: () => {
                    const prefixes = ['Global', 'United', 'International', 'National', 'Royal', 'Premier'];
                    const suffixes = ['Ltd', 'Inc', 'Corp', 'Group', 'Holdings', 'Enterprises'];
                    const industries = ['Trading', 'Services', 'Solutions', 'Systems', 'Technologies', 'Industries'];
                    return `${this.randomChoice(prefixes)} ${this.randomChoice(industries)} ${this.randomChoice(suffixes)}`;
                }
            },
            lorem: {
                words: (count) => {
                    const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor'];
                    return this.randomChoices(words, count).join(' ');
                }
            }
        };
    }
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    logProgress(current, total, entity) {
        if (current % Math.max(1, Math.floor(total / 10)) === 0 || current === total) {
            const percentage = Math.round((current / total) * 100);
            console.log(`Generated ${current}/${total} ${entity} records (${percentage}%)`);
        }
    }
}
exports.BaseGenerator = BaseGenerator;
