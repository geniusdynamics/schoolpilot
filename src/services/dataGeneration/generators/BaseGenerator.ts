// ABOUTME: Base class for all data generators with common utilities
// ABOUTME: Provides shared functionality for realistic data generation

import { DataGenerationConfig } from '../types';

export abstract class BaseGenerator {
  protected config: DataGenerationConfig;
  protected faker: any; // Will be dynamically imported

  constructor(config: DataGenerationConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Dynamically import faker for realistic data generation
    try {
      const { faker } = await import('@faker-js/faker');
      this.faker = faker;
      
      // Set locale if specified in config
      if (this.config.locale) {
        this.faker.setLocale(this.config.locale);
      }
    } catch (error) {
      console.warn('Faker.js not available, using basic data generation');
      this.faker = this.createBasicFaker();
    }
  }

  abstract generateData(count: number): Promise<any[]>;

  protected generateId(prefix: string = 'gen', index?: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const indexStr = index !== undefined ? `_${index.toString().padStart(6, '0')}` : '';
    return `${prefix}_${timestamp}_${random}${indexStr}`;
  }

  protected generateTimestamp(daysAgo: number = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  protected randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  protected randomChoices<T>(array: T[], count: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.randomChoice(array));
    }
    return result;
  }

  protected randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  protected randomFloat(min: number, max: number, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
  }

  protected randomBoolean(probability: number = 0.5): boolean {
    return Math.random() < probability;
  }

  protected randomDate(startDate: Date, endDate: Date): Date {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return new Date(start + Math.random() * (end - start));
  }

  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }



  protected generatePhoneNumber(): string {
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

  protected generateEmail(firstName: string, lastName: string, domain?: string): string {
    if (this.faker?.internet?.email) {
      return this.faker.internet.email(firstName, lastName, domain);
    }
    // Fallback email generation
    const domains = domain ? [domain] : ['gmail.com', 'yahoo.com', 'outlook.com', 'school.edu'];
    const selectedDomain = this.randomChoice(domains);
    const username = `${(firstName || 'user').toLowerCase()}.${(lastName || 'name').toLowerCase()}`;
    return `${username}@${selectedDomain}`;
  }

  protected generateName(gender?: 'male' | 'female'): { first: string; last: string; middle?: string } {
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

  protected generateAddress(): string {
    if (this.faker?.location?.streetAddress) {
      return `${this.faker.location.streetAddress()}, ${this.faker.location.city()}`;
    }
    
    // Fallback address generation
    const streets = ['Main St', 'Oak Ave', 'Park Rd', 'Church St', 'School Rd', 'Market St'];
    const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'];
    
    return `${this.randomInt(1, 999)} ${this.randomChoice(streets)}, ${this.randomChoice(cities)}`;
  }

  protected generateCompanyName(): string {
    if (this.faker?.company?.name) {
      return this.faker.company.name();
    }
    
    // Fallback company name generation
    const prefixes = ['Global', 'United', 'International', 'National', 'Royal', 'Premier'];
    const suffixes = ['Ltd', 'Inc', 'Corp', 'Group', 'Holdings', 'Enterprises'];
    const industries = ['Trading', 'Services', 'Solutions', 'Systems', 'Technologies', 'Industries'];
    
    return `${this.randomChoice(prefixes)} ${this.randomChoice(industries)} ${this.randomChoice(suffixes)}`;
  }

  protected generateText(minWords: number = 5, maxWords: number = 15): string {
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

  protected createBasicFaker(): any {
    // Basic faker implementation for fallback
    const maleNames = ['John', 'James', 'Michael', 'David', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher'];
    const femaleNames = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const cities = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'school.edu'];
    
    return {
      person: {
        firstName: (gender?: string) => {
          const firstNames = gender === 'male' ? maleNames : gender === 'female' ? femaleNames : [...maleNames, ...femaleNames];
          return this.randomChoice(firstNames);
        },
        lastName: () => this.randomChoice(lastNames),
        fullName: (gender?: string) => {
          const firstName = gender === 'male' ? this.randomChoice(maleNames) : gender === 'female' ? this.randomChoice(femaleNames) : this.randomChoice([...maleNames, ...femaleNames]);
          const lastName = this.randomChoice(lastNames);
          return `${firstName} ${lastName}`;
        }
      },
      internet: {
        email: (first: string, last: string, domain?: string) => {
          const selectedDomain = domain || this.randomChoice(domains);
          const username = `${(first || 'user').toLowerCase()}.${(last || 'name').toLowerCase()}`;
          return `${username}@${selectedDomain}`;
        },
        url: () => {
          const protocols = ['http', 'https'];
          const domains = ['example.com', 'test.org', 'demo.net', 'sample.edu'];
          const paths = ['', '/home', '/about', '/contact', '/services', '/products'];
          const protocol = this.randomChoice(protocols);
          const domain = this.randomChoice(domains);
          const path = this.randomChoice(paths);
          return `${protocol}://${domain}${path}`;
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
        city: () => this.randomChoice(['New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Berlin', 'Toronto', 'Mumbai']),
        country: () => this.randomChoice(['USA', 'UK', 'France', 'Japan', 'Australia', 'Germany', 'Canada', 'India']),
        state: () => this.randomChoice(['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia']),
        zipCode: () => String(this.randomInt(10000, 99999))
      },
      company: {
        name: () => {
          const prefixes = ['Global', 'United', 'International', 'National', 'Royal', 'Premier'];
          const suffixes = ['Ltd', 'Inc', 'Corp', 'Group', 'Holdings', 'Enterprises'];
          const industries = ['Trading', 'Services', 'Solutions', 'Systems', 'Technologies', 'Industries'];
          return `${this.randomChoice(prefixes)} ${this.randomChoice(industries)} ${this.randomChoice(suffixes)}`;
        }
      },
      commerce: {
        price: (options: any = {}) => {
          const min = options.min || 1;
          const max = options.max || 100;
          const price = Math.random() * (max - min) + min;
          return price; // Return as number, not string
        },
        productName: () => {
          const adjectives = ['Premium', 'Quality', 'Standard', 'Basic', 'Advanced'];
          const products = ['Product', 'Item', 'Service', 'Solution', 'Package'];
          return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${products[Math.floor(Math.random() * products.length)]}`;
        }
      },
      lorem: {
        words: (count: number) => {
          const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor'];
          return this.randomChoices(words, count).join(' ');
        },
        sentence: (wordCount?: number) => {
          const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore'];
          const count = wordCount || this.randomInt(4, 18);
          const sentence = this.randomChoices(words, count).join(' ');
          return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
        },
        paragraph: (sentenceCount?: number) => {
          const count = sentenceCount || this.randomInt(3, 6);
          const sentences = [];
          for (let i = 0; i < count; i++) {
            sentences.push(this.faker.lorem.sentence());
          }
          return sentences.join(' ');
        },
        paragraphs: (paragraphCount?: number) => {
          const count = paragraphCount || this.randomInt(2, 4);
          const paragraphs = [];
          for (let i = 0; i < count; i++) {
            paragraphs.push(this.faker.lorem.paragraph());
          }
          return paragraphs.join('\n\n');
        }
      },
      date: {
        past: (years: number = 1) => {
          const now = new Date();
          const pastDate = new Date(now.getTime() - (years * 365 * 24 * 60 * 60 * 1000 * Math.random()));
          return pastDate;
        },
        future: (years: number = 1) => {
          const now = new Date();
          const futureDate = new Date(now.getTime() + (years * 365 * 24 * 60 * 60 * 1000 * Math.random()));
          return futureDate;
        },
        between: (from: Date | string, to: Date | string) => {
          const startDate = from instanceof Date ? from : new Date(from);
          const endDate = to instanceof Date ? to : new Date(to);
          const start = startDate.getTime();
          const end = endDate.getTime();
          return new Date(start + Math.random() * (end - start));
        },
        recent: (days: number = 1) => {
          const now = new Date();
          const recentDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000 * Math.random()));
          return recentDate;
        }
      },
      helpers: {
        replaceSymbols: (template: string) => {
          return template.replace(/#/g, () => Math.floor(Math.random() * 10).toString())
                        .replace(/\?/g, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)));
        },
        arrayElement: (array: any[]) => {
          return array[Math.floor(Math.random() * array.length)];
        },
        arrayElements: (array: any[], options?: { min?: number; max?: number } | number) => {
          let count: number;
          if (typeof options === 'number') {
            count = options;
          } else if (options && typeof options === 'object') {
            const min = options.min || 1;
            const max = options.max || array.length;
            count = Math.floor(Math.random() * (max - min + 1)) + min;
          } else {
            count = Math.floor(Math.random() * array.length) + 1;
          }
          const result = [];
          const indices = new Set();
          while (result.length < count && result.length < array.length) {
            const index = Math.floor(Math.random() * array.length);
            if (!indices.has(index)) {
              indices.add(index);
              result.push(array[index]);
            }
          }
          return result;
        },
        weightedArrayElement: (array: Array<{ weight: number; value: any }>) => {
          const totalWeight = array.reduce((sum, item) => sum + item.weight, 0);
          let random = Math.random() * totalWeight;
          for (const item of array) {
            random -= item.weight;
            if (random <= 0) return item.value;
          }
          return array[array.length - 1].value;
        }
      },
      datatype: {
        boolean: (probability: number = 0.5) => {
          return Math.random() < probability;
        }
      },
      number: {
        int: (options: { min?: number; max?: number } = {}) => {
          const min = options.min || 0;
          const max = options.max || 100;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        float: (options: { min?: number; max?: number; precision?: number } = {}) => {
          const min = options.min || 0;
          const max = options.max || 1;
          const precision = options.precision || 0.01;
          const value = Math.random() * (max - min) + min;
          return Math.round(value / precision) * precision;
        }
      },
      finance: {
        accountNumber: () => {
          return String(this.randomInt(1000000000, 9999999999));
        }
      },
      word: {
        adjective: () => {
          const adjectives = ['amazing', 'beautiful', 'creative', 'dynamic', 'elegant', 'fantastic', 'gorgeous', 'incredible', 'magnificent', 'outstanding'];
          return this.randomChoice(adjectives);
        },
        noun: () => {
          const nouns = ['adventure', 'book', 'challenge', 'discovery', 'experience', 'journey', 'knowledge', 'learning', 'mystery', 'story'];
          return this.randomChoice(nouns);
        }
      }
    };
  }

  protected chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected logProgress(current: number, total: number, entity: string): void {
    if (current % Math.max(1, Math.floor(total / 10)) === 0 || current === total) {
      const percentage = Math.round((current / total) * 100);
      console.log(`Generated ${current}/${total} ${entity} records (${percentage}%)`);
    }
  }
}