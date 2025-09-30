// ABOUTME: Enhanced library data generator with 1000+ books, proper categorization and loan management
// ABOUTME: Comprehensive library system with books, authors, publishers, categories, and loan tracking

// ABOUTME: Enhanced library data generator with comprehensive book categorization and loan management
// ABOUTME: Generates extensive library system with books, authors, categories, loans, and staff management

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class LibraryGenerator extends BaseGenerator {
  protected targetBookCount: number;
  protected targetAuthorCount: number;
  protected targetPublisherCount: number;
  protected targetCategoryCount: number;
  protected loanPercentage: number;

  constructor(config: DataGenerationConfig) {
    super(config);
    this.targetBookCount = config.targetBookCount || 1200;
    this.targetAuthorCount = config.targetAuthorCount || 400;
    this.targetPublisherCount = config.targetPublisherCount || 150;
    this.targetCategoryCount = config.targetCategoryCount || 50;
    this.loanPercentage = config.loanPercentage || 0.3; // 30% of books on loan
  }

  async generateData(count: number): Promise<any[]> {
    const results = await this.generate();
    return results;
  }

  async generate() {
    await this.initialize();
    const results = [];
    
    // Generate library categories
    const categories = this.generateCategories();
    results.push(...categories.map(category => ({
      table: 'categories',
      data: category
    })));
    
    // Generate publishers
    const publishers = this.generatePublishers();
    results.push(...publishers.map(publisher => ({
      table: 'publishers',
      data: publisher
    })));
    
    // Generate authors
    const authors = this.generateAuthors();
    results.push(...authors.map(author => ({
      table: 'authors',
      data: author
    })));
    
    // Generate books (1000+)
    const books = this.generateBooks(categories, publishers, authors);
    results.push(...books.map(book => ({
      table: 'books',
      data: book
    })));
    
    // Generate book copies (inventory)
    const bookCopies = this.generateBookCopies(books);
    results.push(...bookCopies.map(copy => ({
      table: 'inventory',
      data: copy
    })));
    
    // Generate loans
    const loans = this.generateLoans(bookCopies);
    results.push(...loans.map(loan => ({
      table: 'loans',
      data: loan
    })));
    
    // Generate fines (extracted from loans)
    const fines = this.generateFines(loans);
    results.push(...fines.map(fine => ({
      table: 'fines',
      data: fine
    })));
    
    // Generate reservations
    const reservations = this.generateReservations(books);
    results.push(...reservations.map(reservation => ({
      table: 'library_reservations',
      data: reservation
    })));
    
    // Generate library staff
    const libraryStaff = this.generateLibraryStaff();
    results.push(...libraryStaff.map(staff => ({
      table: 'library_staff',
      data: staff
    })));
    
    // Generate library settings
    const librarySettings = this.generateLibrarySettings();
    results.push(...librarySettings.map(setting => ({
      table: 'library_settings',
      data: setting
    })));
    
    return results;
  }
  
  generateCategories() {
    const categories = [];
    const categoryData = [
      { name: 'Fiction', description: 'Novels, short stories, and fictional works', dewey_range: '800-899' },
      { name: 'Non-Fiction', description: 'Factual books and reference materials', dewey_range: '000-799' },
      { name: 'Science', description: 'Scientific texts and research', dewey_range: '500-599' },
      { name: 'Mathematics', description: 'Mathematical texts and references', dewey_range: '510-519' },
      { name: 'History', description: 'Historical texts and biographies', dewey_range: '900-999' },
      { name: 'Literature', description: 'Classic and contemporary literature', dewey_range: '800-899' },
      { name: 'Philosophy', description: 'Philosophical works and ethics', dewey_range: '100-199' },
      { name: 'Religion', description: 'Religious texts and studies', dewey_range: '200-299' },
      { name: 'Social Sciences', description: 'Sociology, psychology, education', dewey_range: '300-399' },
      { name: 'Language', description: 'Linguistics and language studies', dewey_range: '400-499' },
      { name: 'Technology', description: 'Applied sciences and technology', dewey_range: '600-699' },
      { name: 'Arts', description: 'Fine arts, music, and recreation', dewey_range: '700-799' },
      { name: 'Biography', description: 'Biographical works', dewey_range: '920-929' },
      { name: 'Reference', description: 'Dictionaries, encyclopedias, atlases', dewey_range: '000-099' },
      { name: 'Children\'s Books', description: 'Books for young readers', dewey_range: 'J000-J999' },
      { name: 'Young Adult', description: 'Books for teenage readers', dewey_range: 'YA000-YA999' },
      { name: 'Textbooks', description: 'Educational textbooks', dewey_range: 'TEXT000-TEXT999' },
      { name: 'Periodicals', description: 'Magazines and journals', dewey_range: 'PER000-PER999' },
      { name: 'Audio Books', description: 'Audio format books', dewey_range: 'AUDIO000-AUDIO999' },
      { name: 'Digital Resources', description: 'E-books and digital materials', dewey_range: 'DIGITAL000-DIGITAL999' }
    ];
    
    categoryData.forEach((cat, index) => {
      categories.push({
        id: this.generateId('CAT'),
        name: cat.name,
        description: cat.description,
        dewey_decimal_range: cat.dewey_range,
        parent_category_id: null,
        is_active: true,
        sort_order: index + 1,
        created_at: this.faker.date.past({ years: 2 }),
        updated_at: this.faker.date.recent()
      });
    });
    
    // Add subcategories
    const subcategories = [
      { parent: 'Fiction', name: 'Mystery', description: 'Mystery and detective fiction' },
      { parent: 'Fiction', name: 'Romance', description: 'Romantic fiction' },
      { parent: 'Fiction', name: 'Science Fiction', description: 'Science fiction novels' },
      { parent: 'Fiction', name: 'Fantasy', description: 'Fantasy literature' },
      { parent: 'Science', name: 'Biology', description: 'Biological sciences' },
      { parent: 'Science', name: 'Chemistry', description: 'Chemical sciences' },
      { parent: 'Science', name: 'Physics', description: 'Physical sciences' },
      { parent: 'History', name: 'World History', description: 'Global historical events' },
      { parent: 'History', name: 'Local History', description: 'Regional and local history' },
      { parent: 'Arts', name: 'Visual Arts', description: 'Painting, sculpture, photography' }
    ];
    
    subcategories.forEach((subcat, index) => {
      const parentCategory = categories.find(c => c.name === subcat.parent);
      if (parentCategory) {
        categories.push({
          id: this.generateId('SUBCAT'),
          name: subcat.name,
          description: subcat.description,
          dewey_decimal_range: parentCategory.dewey_decimal_range,
          parent_category_id: parentCategory.id,
          is_active: true,
          sort_order: categories.length + index + 1,
          created_at: this.faker.date.past({ years: 2 }),
          updated_at: this.faker.date.recent()
        });
      }
    });
    
    return categories;
  }
  
  generatePublishers() {
    const publishers = [];
    const publisherNames = [
      'Penguin Random House', 'HarperCollins', 'Macmillan Publishers', 'Simon & Schuster',
      'Hachette Book Group', 'Scholastic', 'Pearson Education', 'McGraw-Hill Education',
      'Oxford University Press', 'Cambridge University Press', 'Wiley', 'Springer',
      'Elsevier', 'Taylor & Francis', 'SAGE Publications', 'Academic Press',
      'MIT Press', 'Harvard University Press', 'Yale University Press', 'Princeton University Press'
    ];
    
    // Add major publishers
    publisherNames.forEach(name => {
      publishers.push({
        id: this.generateId('PUB'),
        name: name,
        address: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        state: this.faker.location.state(),
        country: this.faker.location.country(),
        postal_code: this.faker.location.zipCode(),
        phone: this.faker.phone.number(),
        email: this.faker.internet.email(),
        website: this.faker.internet.url(),
        established_year: this.faker.date.between({ from: '1800-01-01', to: '2020-01-01' }).getFullYear(),
        is_active: true,
        created_at: this.faker.date.past({ years: 3 }),
        updated_at: this.faker.date.recent()
      });
    });
    
    // Add smaller publishers
    for (let i = 0; i < this.targetPublisherCount - publisherNames.length; i++) {
      publishers.push({
        id: this.generateId('PUB'),
        name: this.faker.company.name() + ' Publishing',
        address: this.faker.location.streetAddress(),
        city: this.faker.location.city(),
        state: this.faker.location.state(),
        country: this.faker.location.country(),
        postal_code: this.faker.location.zipCode(),
        phone: this.faker.phone.number(),
        email: this.faker.internet.email(),
        website: this.faker.internet.url(),
        established_year: this.faker.date.between({ from: '1900-01-01', to: '2023-01-01' }).getFullYear(),
        is_active: this.faker.datatype.boolean(0.9),
        created_at: this.faker.date.past({ years: 3 }),
        updated_at: this.faker.date.recent()
      });
    }
    
    return publishers;
  }
  
  generateAuthors() {
    const authors = [];
    
    for (let i = 0; i < this.targetAuthorCount; i++) {
      const firstName = this.faker.person.firstName();
      const lastName = this.faker.person.lastName();
      
      authors.push({
        id: this.generateId('AUTH'),
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        birth_date: this.faker.date.between({ from: '1920-01-01', to: '2000-01-01' }),
        death_date: this.faker.datatype.boolean(0.1) ? this.faker.date.between({ from: '2000-01-01', to: '2023-01-01' }) : null,
        nationality: this.faker.location.country(),
        biography: this.faker.lorem.paragraphs(2),
        genres: this.faker.helpers.arrayElements([
          'Fiction', 'Non-Fiction', 'Science', 'History', 'Biography',
          'Mystery', 'Romance', 'Science Fiction', 'Fantasy', 'Literature'
        ], { min: 1, max: 3 }),
        awards: this.faker.datatype.boolean(0.3) ? this.faker.helpers.arrayElements([
          'Pulitzer Prize', 'Nobel Prize in Literature', 'Booker Prize',
          'National Book Award', 'Hugo Award', 'Nebula Award'
        ], { min: 1, max: 2 }) : [],
        website: this.faker.datatype.boolean(0.4) ? this.faker.internet.url() : null,
        is_active: true,
        created_at: this.faker.date.past({ years: 3 }),
        updated_at: this.faker.date.recent()
      });
    }
    
    return authors;
  }
  
  generateBooks(categories, publishers, authors) {
    const books = [];
    
    for (let i = 0; i < this.targetBookCount; i++) {
      const category = this.faker.helpers.arrayElement(categories);
      const publisher = this.faker.helpers.arrayElement(publishers);
      const bookAuthors = this.faker.helpers.arrayElements(authors, { min: 1, max: 3 });
      
      const publishedDate = this.faker.date.between({ from: '1950-01-01', to: '2023-01-01' });
      
      books.push({
        id: this.generateId('BOOK'),
        isbn: this.faker.helpers.replaceSymbols('###-#-##-######-#'),
        isbn13: this.faker.helpers.replaceSymbols('###-#-##-######-#'),
        title: this.generateBookTitle(category.name),
        subtitle: this.faker.datatype.boolean(0.3) ? this.faker.lorem.sentence() : null,
        author_ids: bookAuthors.map(a => a.id),
        primary_author_id: bookAuthors[0].id,
        publisher_id: publisher.id,
        category_id: category.id,
        publication_date: publishedDate,
        edition: this.faker.number.int({ min: 1, max: 5 }),
        pages: this.faker.number.int({ min: 50, max: 1200 }),
        language: this.faker.helpers.weightedArrayElement([
          { weight: 80, value: 'English' },
          { weight: 10, value: 'Spanish' },
          { weight: 5, value: 'French' },
          { weight: 3, value: 'German' },
          { weight: 2, value: 'Other' }
        ]),
        format: this.faker.helpers.arrayElement(['Hardcover', 'Paperback', 'E-book', 'Audiobook']),
        dewey_decimal: this.generateDeweyDecimal(category.dewey_decimal_range),
        description: this.faker.lorem.paragraphs(3),
        summary: this.faker.lorem.paragraph(),
        keywords: this.faker.helpers.arrayElements([
          'education', 'research', 'academic', 'study', 'reference',
          'fiction', 'non-fiction', 'classic', 'contemporary', 'bestseller'
        ], { min: 2, max: 5 }),
        price: parseFloat(this.faker.commerce.price({ min: 10, max: 200 })),
        acquisition_date: this.faker.date.between({ from: publishedDate, to: new Date() }),
        acquisition_cost: parseFloat(this.faker.commerce.price({ min: 8, max: 150 })),
        condition: this.faker.helpers.arrayElement(['Excellent', 'Good', 'Fair', 'Poor']),
        location_code: this.faker.helpers.replaceSymbols('##?-###'),
        is_reference_only: this.faker.datatype.boolean(0.1),
        is_available: true,
        total_copies: this.faker.number.int({ min: 1, max: 5 }),
        available_copies: 0, // Will be calculated based on loans
        rating: this.faker.number.float({ min: 1, max: 5, precision: 0.1 }),
        review_count: this.faker.number.int({ min: 0, max: 500 }),
        created_at: this.faker.date.past({ years: 3 }),
        updated_at: this.faker.date.recent()
      });
    }
    
    return books;
  }
  
  generateBookTitle(categoryName) {
    const titleTemplates = {
      'Fiction': [
        'The {adjective} {noun}',
        '{noun} of {noun}',
        'The Last {noun}',
        '{adjective} {noun}s',
        'Beyond the {noun}'
      ],
      'Science': [
        'Introduction to {noun}',
        'Advanced {noun}',
        'Principles of {noun}',
        '{noun}: Theory and Practice',
        'Modern {noun}'
      ],
      'History': [
        'The {adjective} History of {noun}',
        '{noun} in the {adjective} Century',
        'Chronicles of {noun}',
        'The Rise and Fall of {noun}',
        '{noun}: A Historical Perspective'
      ],
      'Mathematics': [
        'Calculus and {noun}',
        'Linear {noun}',
        'Discrete {noun}',
        'Applied {noun}',
        'Mathematical {noun}'
      ]
    };
    
    const templates = titleTemplates[categoryName] || titleTemplates['Fiction'];
    const template = this.faker.helpers.arrayElement(templates);
    
    return template
      .replace('{adjective}', this.faker.word.adjective())
      .replace('{noun}', this.faker.word.noun());
  }
  
  generateDeweyDecimal(range) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(r => parseInt(r.replace(/[^0-9]/g, '')));
      const base = this.faker.number.int({ min: start, max: end });
      const decimal = this.faker.number.int({ min: 0, max: 99 }).toString().padStart(2, '0');
      return `${base}.${decimal}`;
    }
    return this.faker.helpers.replaceSymbols('###.##');
  }
  
  generateBookCopies(books) {
    const copies = [];
    
    books.forEach(book => {
      for (let i = 0; i < book.total_copies; i++) {
        copies.push({
          id: this.generateId('COPY'),
          book_id: book.id,
          copy_number: i + 1,
          barcode: this.faker.helpers.replaceSymbols('############'),
          condition: this.faker.helpers.arrayElement(['Excellent', 'Good', 'Fair', 'Poor']),
          location: this.faker.helpers.replaceSymbols('##?-###'),
          is_available: true,
          last_checked: this.faker.date.recent({ days: 30 }),
          notes: this.faker.datatype.boolean(0.2) ? this.faker.lorem.sentence() : null,
          created_at: book.created_at,
          updated_at: this.faker.date.recent()
        });
      }
    });
    
    return copies;
  }
  
  generateLoans(bookCopies) {
    const loans = [];
    const loanCount = Math.floor(bookCopies.length * this.loanPercentage);
    const selectedCopies = this.faker.helpers.arrayElements(bookCopies, loanCount);
    
    selectedCopies.forEach(copy => {
      const loanDate = this.faker.date.recent({ days: 30 });
      const dueDate = new Date(loanDate);
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks loan period
      
      const isOverdue = this.faker.datatype.boolean(0.1);
      const isReturned = this.faker.datatype.boolean(0.7);
      
      loans.push({
        id: this.generateId('LOAN'),
        copy_id: copy.id,
        student_id: this.generateId('STU'), // Reference to student
        loan_date: loanDate,
        due_date: dueDate,
        return_date: isReturned ? this.faker.date.between({ from: loanDate, to: new Date() }) : null,
        renewal_count: this.faker.number.int({ min: 0, max: 2 }),
        fine_amount: isOverdue ? parseFloat(this.faker.commerce.price({ min: 1, max: 20 })) : 0,
        fine_paid: isOverdue ? this.faker.datatype.boolean(0.6) : true,
        status: isReturned ? 'returned' : (isOverdue ? 'overdue' : 'active'),
        notes: this.faker.datatype.boolean(0.1) ? this.faker.lorem.sentence() : null,
        created_at: loanDate,
        updated_at: this.faker.date.recent()
      });
      
      // Update copy availability
      copy.is_available = isReturned;
    });
    
    return loans;
  }
  
  generateFines(loans) {
    const fines = [];
    
    loans.forEach(loan => {
      if (loan.fine_amount > 0) {
        fines.push({
          id: this.generateId('FINE'),
          loan_id: loan.id,
          student_id: loan.student_id,
          fine_amount: loan.fine_amount,
          amount_paid: loan.fine_paid ? loan.fine_amount : 0,
          balance: loan.fine_paid ? 0 : loan.fine_amount,
          fine_type: 'overdue',
          fine_date: loan.due_date,
          payment_date: loan.fine_paid ? this.faker.date.between({ from: loan.due_date, to: new Date() }) : null,
          payment_method: loan.fine_paid ? this.faker.helpers.arrayElement(['Cash', 'Bank Transfer', 'Mobile Money']) : null,
          receipt_number: loan.fine_paid ? this.faker.helpers.replaceSymbols('RCP######') : null,
          status: loan.fine_paid ? 'paid' : 'pending',
          waived: this.faker.datatype.boolean(0.05), // 5% chance of waiver
          waived_by: this.faker.datatype.boolean(0.05) ? this.generateId('STAFF') : null,
          waived_reason: this.faker.datatype.boolean(0.05) ? this.faker.helpers.arrayElement(['Student hardship', 'System error', 'Administrative decision']) : null,
          notes: this.faker.datatype.boolean(0.1) ? this.faker.lorem.sentence() : null,
          created_at: loan.due_date,
          updated_at: this.faker.date.recent()
        });
      }
    });
    
    return fines;
  }
  
  generateReservations(books) {
    const reservations = [];
    const reservationCount = Math.floor(books.length * 0.05); // 5% of books have reservations
    const selectedBooks = this.faker.helpers.arrayElements(books, reservationCount);
    
    selectedBooks.forEach(book => {
      const reservationDate = this.faker.date.recent({ days: 7 });
      const expiryDate = new Date(reservationDate);
      expiryDate.setDate(expiryDate.getDate() + 7); // 1 week reservation
      
      reservations.push({
        id: this.generateId('RES'),
        book_id: book.id,
        student_id: this.generateId('STU'), // Reference to student
        reservation_date: reservationDate,
        expiry_date: expiryDate,
        status: this.faker.helpers.arrayElement(['active', 'fulfilled', 'expired', 'cancelled']),
        priority: this.faker.number.int({ min: 1, max: 10 }),
        notification_sent: this.faker.datatype.boolean(0.8),
        notes: this.faker.datatype.boolean(0.1) ? this.faker.lorem.sentence() : null,
        created_at: reservationDate,
        updated_at: this.faker.date.recent()
      });
    });
    
    return reservations;
  }
  
  generateLibraryStaff() {
    const staff = [];
    const positions = [
      'Head Librarian', 'Assistant Librarian', 'Library Technician',
      'Cataloging Specialist', 'Reference Librarian', 'Digital Resources Coordinator'
    ];
    
    positions.forEach(position => {
      staff.push({
        id: this.generateId('LIBSTAFF'),
        staff_id: this.generateId('STAFF'), // Reference to main staff table
        position: position,
        department: 'Library Services',
        qualifications: this.faker.helpers.arrayElements([
          'Master of Library Science', 'Bachelor of Information Science',
          'Library Technician Certificate', 'Digital Archives Certification'
        ], { min: 1, max: 2 }),
        specializations: this.faker.helpers.arrayElements([
          'Cataloging', 'Reference Services', 'Digital Resources',
          'Children\'s Literature', 'Academic Research', 'Archives'
        ], { min: 1, max: 3 }),
        hire_date: this.faker.date.past({ years: 5 }),
        is_active: true,
        created_at: this.faker.date.past({ years: 5 }),
        updated_at: this.faker.date.recent()
      });
    });
    
    return staff;
  }
  
  generateLibrarySettings() {
    const settings = [
      {
        id: this.generateId('SET'),
        setting_key: 'loan_period_days',
        setting_value: '14',
        description: 'Default loan period in days',
        category: 'loans'
      },
      {
        id: this.generateId('SET'),
        setting_key: 'max_renewals',
        setting_value: '2',
        description: 'Maximum number of renewals allowed',
        category: 'loans'
      },
      {
        id: this.generateId('SET'),
        setting_key: 'fine_per_day',
        setting_value: '0.50',
        description: 'Fine amount per day for overdue books',
        category: 'fines'
      },
      {
        id: this.generateId('SET'),
        setting_key: 'max_books_per_student',
        setting_value: '5',
        description: 'Maximum books a student can borrow',
        category: 'loans'
      },
      {
        id: this.generateId('SET'),
        setting_key: 'reservation_period_days',
        setting_value: '7',
        description: 'How long a reservation is held',
        category: 'reservations'
      }
    ];
    
    return settings.map(setting => ({
      ...setting,
      is_active: true,
      created_at: this.faker.date.past({ years: 2 }),
      updated_at: this.faker.date.recent()
    }));
  }
}