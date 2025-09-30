// ABOUTME: Generates comprehensive academic data including subjects, grading schemes, assessments, and academic hierarchies
// ABOUTME: Creates detailed subject trees, assessment frameworks, and grade boundaries for complete academic management

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class AcademicsGenerator extends BaseGenerator {
  private subjectHierarchy: any[] = [];
  private gradingSchemes: any[] = [];
  private assessmentFrameworks: any[] = [];
  private gradeBoundaries: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    const results = await this.generate();
    return results;
  }

  async generate(): Promise<any[]> {
    const results: any[] = [];

    // Generate comprehensive academic data
    results.push(...await this.generateSubjectHierarchy(50));
    results.push(...await this.generateGradingSchemes(10));
    results.push(...await this.generateAssessmentFrameworks(15));
    results.push(...await this.generateGradeBoundaries(100));
    results.push(...await this.generateExamSessions(20));
    results.push(...await this.generateStudentResults(500));
    results.push(...await this.generateTeacherAssignments(100));
    results.push(...await this.generateTimetables(50));
    results.push(...await this.generateCurriculumStructures(20));

    return results;
  }

  private async generateSubjectHierarchy(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const subjectCategories = {
      'Core Subjects': {
        'Languages': {
          'English': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Grammar', 'Literature', 'Composition', 'Oral Skills', 'Reading Comprehension'],
            assessment_types: ['CAT', 'Assignment', 'Project', 'End Term Exam']
          },
          'Kiswahili': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Sarufi', 'Fasihi', 'Insha', 'Mazungumzo', 'Kusoma'],
            assessment_types: ['CAT', 'Assignment', 'Project', 'End Term Exam']
          }
        },
        'Mathematics': {
          'Pure Mathematics': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics', 'Calculus'],
            assessment_types: ['CAT', 'Assignment', 'End Term Exam']
          }
        },
        'Sciences': {
          'Biology': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C'],
            topics: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Plant Biology'],
            assessment_types: ['CAT', 'Practical', 'Assignment', 'End Term Exam']
          },
          'Chemistry': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C'],
            topics: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry'],
            assessment_types: ['CAT', 'Practical', 'Assignment', 'End Term Exam']
          },
          'Physics': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C'],
            topics: ['Mechanics', 'Thermodynamics', 'Electricity', 'Magnetism', 'Waves'],
            assessment_types: ['CAT', 'Practical', 'Assignment', 'End Term Exam']
          }
        }
      },
      'Humanities': {
        'Social Studies': {
          'History': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['World History', 'African History', 'Kenyan History', 'Government'],
            assessment_types: ['CAT', 'Assignment', 'Project', 'End Term Exam']
          },
          'Geography': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Physical Geography', 'Human Geography', 'Economic Geography', 'Map Work'],
            assessment_types: ['CAT', 'Assignment', 'Field Work', 'End Term Exam']
          }
        },
        'Religious Studies': {
          'CRE': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Old Testament', 'New Testament', 'Christian Ethics', 'Church History'],
            assessment_types: ['CAT', 'Assignment', 'Project', 'End Term Exam']
          },
          'IRE': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Quran Studies', 'Hadith', 'Islamic History', 'Islamic Ethics'],
            assessment_types: ['CAT', 'Assignment', 'Project', 'End Term Exam']
          }
        }
      },
      'Technical Subjects': {
        'Technology': {
          'Computer Studies': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C'],
            topics: ['Programming', 'Database Management', 'Computer Networks', 'Web Development'],
            assessment_types: ['CAT', 'Practical', 'Project', 'End Term Exam']
          }
        },
        'Business': {
          'Business Studies': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C', 'D'],
            topics: ['Entrepreneurship', 'Marketing', 'Finance', 'Management'],
            assessment_types: ['CAT', 'Assignment', 'Project', 'End Term Exam']
          }
        },
        'Applied Sciences': {
          'Agriculture': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C'],
            topics: ['Crop Production', 'Animal Husbandry', 'Soil Science', 'Farm Management'],
            assessment_types: ['CAT', 'Practical', 'Project', 'End Term Exam']
          },
          'Home Science': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B', 'C'],
            topics: ['Nutrition', 'Clothing', 'Home Management', 'Child Development'],
            assessment_types: ['CAT', 'Practical', 'Project', 'End Term Exam']
          }
        }
      },
      'Creative Arts': {
        'Visual Arts': {
          'Art & Design': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B'],
            topics: ['Drawing', 'Painting', 'Sculpture', 'Graphic Design'],
            assessment_types: ['CAT', 'Practical', 'Portfolio', 'End Term Exam']
          }
        },
        'Performing Arts': {
          'Music': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B'],
            topics: ['Music Theory', 'Performance', 'Composition', 'Music History'],
            assessment_types: ['CAT', 'Practical', 'Performance', 'End Term Exam']
          }
        }
      },
      'Foreign Languages': {
        'European Languages': {
          'French': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B'],
            topics: ['Grammar', 'Vocabulary', 'Conversation', 'Literature'],
            assessment_types: ['CAT', 'Oral Test', 'Assignment', 'End Term Exam']
          },
          'German': {
            forms: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
            streams: ['A', 'B'],
            topics: ['Grammar', 'Vocabulary', 'Conversation', 'Culture'],
            assessment_types: ['CAT', 'Oral Test', 'Assignment', 'End Term Exam']
          }
        }
      }
    };

    let subjectId = 1;
    for (const [categoryName, categoryData] of Object.entries(subjectCategories)) {
      for (const [departmentName, departmentData] of Object.entries(categoryData)) {
        for (const [subjectName, subjectData] of Object.entries(departmentData as any)) {
          const typedSubjectData = subjectData as any;
          for (const form of typedSubjectData.forms) {
            for (const stream of typedSubjectData.streams) {
              results.push({
                table: 'subjects',
                data: {
                  id: this.generateId('subj', subjectId++),
                  name: subjectName,
                  code: this.generateSubjectCode(subjectName, form, stream),
                  category: categoryName,
                  department: departmentName,
                  form: form,
                  stream: stream,
                  description: `${subjectName} for ${form} ${stream}`,
                  topics: typedSubjectData.topics,
                  assessment_types: typedSubjectData.assessment_types,
                  credit_hours: this.randomInt(3, 6),
                  is_core: categoryName === 'Core Subjects',
                  is_optional: categoryName !== 'Core Subjects',
                  prerequisites: this.generatePrerequisites(subjectName, form),
                  learning_outcomes: this.generateLearningOutcomes(subjectName),
                  is_active: true,
                  created_at: this.generateTimestamp(365),
                  updated_at: this.generateTimestamp(30)
                }
              });
            }
          }
        }
      }
    }

    this.subjectHierarchy = results;
    return results;
  }

  private generateSubjectCode(subject: string, form: string, stream: string): string {
    const subjectCode = subject.substring(0, 3).toUpperCase();
    const formCode = form.replace('Form ', 'F');
    return `${subjectCode}${formCode}${stream}`;
  }

  private generatePrerequisites(subject: string, form: string): string[] {
    const prerequisites: { [key: string]: string[] } = {
      'Chemistry': form !== 'Form 1' ? ['Mathematics', 'Physics'] : [],
      'Physics': form !== 'Form 1' ? ['Mathematics'] : [],
      'Biology': form !== 'Form 1' ? ['Chemistry'] : [],
      'Computer Studies': form !== 'Form 1' ? ['Mathematics'] : [],
      'Business Studies': form !== 'Form 1' ? ['Mathematics', 'English'] : []
    };
    return prerequisites[subject] || [];
  }

  private generateLearningOutcomes(subject: string): string[] {
    const outcomes: { [key: string]: string[] } = {
      'Mathematics': [
        'Solve complex mathematical problems',
        'Apply mathematical concepts to real-world situations',
        'Demonstrate logical reasoning skills'
      ],
      'English': [
        'Communicate effectively in written and spoken English',
        'Analyze literary texts critically',
        'Demonstrate advanced writing skills'
      ],
      'Biology': [
        'Understand biological processes and systems',
        'Apply scientific method in biological investigations',
        'Demonstrate laboratory skills'
      ],
      'Chemistry': [
        'Understand chemical principles and reactions',
        'Apply chemical knowledge to solve problems',
        'Demonstrate safe laboratory practices'
      ],
      'Physics': [
        'Understand physical laws and principles',
        'Apply physics concepts to solve problems',
        'Demonstrate experimental skills'
      ]
    };
    return outcomes[subject] || [
      'Demonstrate understanding of subject concepts',
      'Apply knowledge to solve problems',
      'Show critical thinking skills'
    ];
  }

  private async generateGradingSchemes(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const gradingSchemes = [
      {
        name: 'KCSE Grading System',
        description: 'Kenya Certificate of Secondary Education grading system',
        type: 'National',
        levels: [
          { grade: 'A', min_score: 80, max_score: 100, points: 12, description: 'Excellent' },
          { grade: 'A-', min_score: 75, max_score: 79, points: 11, description: 'Very Good' },
          { grade: 'B+', min_score: 70, max_score: 74, points: 10, description: 'Good Plus' },
          { grade: 'B', min_score: 65, max_score: 69, points: 9, description: 'Good' },
          { grade: 'B-', min_score: 60, max_score: 64, points: 8, description: 'Good Minus' },
          { grade: 'C+', min_score: 55, max_score: 59, points: 7, description: 'Credit Plus' },
          { grade: 'C', min_score: 50, max_score: 54, points: 6, description: 'Credit' },
          { grade: 'C-', min_score: 45, max_score: 49, points: 5, description: 'Credit Minus' },
          { grade: 'D+', min_score: 40, max_score: 44, points: 4, description: 'Pass Plus' },
          { grade: 'D', min_score: 35, max_score: 39, points: 3, description: 'Pass' },
          { grade: 'D-', min_score: 30, max_score: 34, points: 2, description: 'Pass Minus' },
          { grade: 'E', min_score: 0, max_score: 29, points: 1, description: 'Fail' }
        ]
      },
      {
        name: 'Internal Assessment Grading',
        description: 'School internal assessment grading system',
        type: 'Internal',
        levels: [
          { grade: 'Excellent', min_score: 90, max_score: 100, points: 5, description: 'Outstanding Performance' },
          { grade: 'Very Good', min_score: 80, max_score: 89, points: 4, description: 'Very Good Performance' },
          { grade: 'Good', min_score: 70, max_score: 79, points: 3, description: 'Good Performance' },
          { grade: 'Satisfactory', min_score: 60, max_score: 69, points: 2, description: 'Satisfactory Performance' },
          { grade: 'Needs Improvement', min_score: 0, max_score: 59, points: 1, description: 'Needs Improvement' }
        ]
      },
      {
        name: 'Practical Skills Assessment',
        description: 'Assessment for practical and laboratory work',
        type: 'Practical',
        levels: [
          { grade: 'Mastery', min_score: 85, max_score: 100, points: 4, description: 'Complete mastery of skills' },
          { grade: 'Proficient', min_score: 70, max_score: 84, points: 3, description: 'Proficient in skills' },
          { grade: 'Developing', min_score: 55, max_score: 69, points: 2, description: 'Developing skills' },
          { grade: 'Beginning', min_score: 0, max_score: 54, points: 1, description: 'Beginning level skills' }
        ]
      },
      {
        name: 'IB Grading System',
        description: 'International Baccalaureate grading system',
        type: 'International',
        levels: [
          { grade: '7', min_score: 96, max_score: 100, points: 7, description: 'Excellent' },
          { grade: '6', min_score: 86, max_score: 95, points: 6, description: 'Very Good' },
          { grade: '5', min_score: 76, max_score: 85, points: 5, description: 'Good' },
          { grade: '4', min_score: 66, max_score: 75, points: 4, description: 'Satisfactory' },
          { grade: '3', min_score: 56, max_score: 65, points: 3, description: 'Mediocre' },
          { grade: '2', min_score: 46, max_score: 55, points: 2, description: 'Poor' },
          { grade: '1', min_score: 0, max_score: 45, points: 1, description: 'Very Poor' }
        ]
      },
      {
        name: 'Cambridge IGCSE Grading',
        description: 'Cambridge International General Certificate grading system',
        type: 'International',
        levels: [
          { grade: 'A*', min_score: 90, max_score: 100, points: 9, description: 'Outstanding' },
          { grade: 'A', min_score: 80, max_score: 89, points: 8, description: 'Excellent' },
          { grade: 'B', min_score: 70, max_score: 79, points: 7, description: 'Good' },
          { grade: 'C', min_score: 60, max_score: 69, points: 6, description: 'Satisfactory' },
          { grade: 'D', min_score: 50, max_score: 59, points: 5, description: 'Acceptable' },
          { grade: 'E', min_score: 40, max_score: 49, points: 4, description: 'Below Average' },
          { grade: 'F', min_score: 30, max_score: 39, points: 3, description: 'Poor' },
          { grade: 'G', min_score: 20, max_score: 29, points: 2, description: 'Very Poor' },
          { grade: 'U', min_score: 0, max_score: 19, points: 1, description: 'Ungraded' }
        ]
      }
    ];

    gradingSchemes.forEach((scheme, index) => {
      const schemeId = this.generateId('grad', index + 1);
      
      results.push({
        table: 'grading_schemes',
        data: {
          id: schemeId,
          name: scheme.name,
          description: scheme.description,
          type: scheme.type,
          is_active: true,
          is_default: index === 0,
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        }
      });

      scheme.levels.forEach((level, levelIndex) => {
        results.push({
          table: 'grading_scheme_levels',
          data: {
            id: this.generateId('gradlvl', (index * 20) + levelIndex + 1),
            grading_scheme_id: schemeId,
            grade: level.grade,
            min_score: level.min_score,
            max_score: level.max_score,
            points: level.points,
            description: level.description,
            order_index: levelIndex + 1,
            is_passing: level.points >= 3,
            created_at: this.generateTimestamp(365),
            updated_at: this.generateTimestamp(30)
          }
        });
      });
    });

    this.gradingSchemes = results;
    return results;
  }

  private async generateAssessmentFrameworks(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const assessmentTypes = [
      {
        name: 'Continuous Assessment Test (CAT)',
        description: 'Regular assessment tests conducted throughout the term',
        weight_percentage: 30,
        frequency: 'Weekly',
        duration_minutes: 40,
        question_types: ['Multiple Choice', 'Short Answer', 'Essay'],
        marking_criteria: {
          'Knowledge': 40,
          'Understanding': 30,
          'Application': 20,
          'Analysis': 10
        }
      },
      {
        name: 'End Term Examination',
        description: 'Comprehensive examination at the end of each term',
        weight_percentage: 60,
        frequency: 'Termly',
        duration_minutes: 120,
        question_types: ['Multiple Choice', 'Short Answer', 'Essay', 'Problem Solving'],
        marking_criteria: {
          'Knowledge': 30,
          'Understanding': 25,
          'Application': 25,
          'Analysis': 15,
          'Synthesis': 5
        }
      },
      {
        name: 'Assignment',
        description: 'Take-home assignments and projects',
        weight_percentage: 10,
        frequency: 'Bi-weekly',
        duration_minutes: null,
        question_types: ['Research', 'Project', 'Essay', 'Problem Solving'],
        marking_criteria: {
          'Research': 25,
          'Content': 30,
          'Presentation': 20,
          'Originality': 15,
          'Timeliness': 10
        }
      },
      {
        name: 'Practical Assessment',
        description: 'Laboratory and practical work assessment',
        weight_percentage: 20,
        frequency: 'Weekly',
        duration_minutes: 80,
        question_types: ['Practical', 'Observation', 'Report Writing'],
        marking_criteria: {
          'Procedure': 30,
          'Observation': 25,
          'Results': 25,
          'Analysis': 15,
          'Safety': 5
        }
      },
      {
        name: 'Oral Assessment',
        description: 'Speaking and presentation skills assessment',
        weight_percentage: 15,
        frequency: 'Monthly',
        duration_minutes: 15,
        question_types: ['Presentation', 'Discussion', 'Interview'],
        marking_criteria: {
          'Fluency': 25,
          'Content': 30,
          'Confidence': 20,
          'Interaction': 15,
          'Pronunciation': 10
        }
      }
    ];

    assessmentTypes.forEach((assessment, index) => {
      results.push({
        table: 'assessment_frameworks',
        data: {
          id: this.generateId('assess', index + 1),
          name: assessment.name,
          description: assessment.description,
          weight_percentage: assessment.weight_percentage,
          frequency: assessment.frequency,
          duration_minutes: assessment.duration_minutes,
          question_types: assessment.question_types,
          marking_criteria: assessment.marking_criteria,
          is_active: true,
          requires_moderation: assessment.weight_percentage >= 50,
          allows_retake: assessment.name.includes('CAT') || assessment.name.includes('Assignment'),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        }
      });
    });

    this.assessmentFrameworks = results;
    return results;
  }

  private async generateGradeBoundaries(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const subjects = ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography'];
    const forms = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    const years = ['2023', '2024'];

    let boundaryId = 1;
    for (const year of years) {
      for (const term of terms) {
        for (const form of forms) {
          for (const subject of subjects) {
            // Generate grade boundaries with some variation
            const baseA = this.randomInt(78, 85);
            const baseB = this.randomInt(65, 72);
            const baseC = this.randomInt(50, 57);
            const baseD = this.randomInt(35, 42);

            results.push({
              table: 'grade_boundaries',
              data: {
                id: this.generateId('boundary', boundaryId++),
                subject: subject,
                form: form,
                term: term,
                year: year,
                grade_a_min: baseA,
                grade_b_min: baseB,
                grade_c_min: baseC,
                grade_d_min: baseD,
                grade_e_min: 0,
                mean_score: this.randomInt(45, 75),
                standard_deviation: this.randomFloat(8, 15),
                total_candidates: this.randomInt(80, 150),
                highest_score: this.randomInt(85, 100),
                lowest_score: this.randomInt(5, 25),
                moderation_factor: this.randomFloat(0.95, 1.05),
                is_final: true,
                approved_by: this.randomChoice(['Principal', 'Deputy Principal', 'Academic Director']),
                approved_at: this.generateTimestamp(30),
                created_at: this.generateTimestamp(365),
                updated_at: this.generateTimestamp(30)
              }
            });
          }
        }
      }
    }

    this.gradeBoundaries = results;
    return results;
  }

  private async generateExamSessions(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const examTypes = ['CAT 1', 'CAT 2', 'Mid Term', 'End Term', 'Mock Exam', 'KCSE Trial'];
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    const years = ['2023', '2024'];

    let sessionId = 1;
    for (const year of years) {
      for (const term of terms) {
        for (const examType of examTypes) {
          results.push({
            table: 'exams',
            data: {
              id: this.generateId('session', sessionId++),
              name: `${examType} - ${term} ${year}`,
              exam_type: examType,
              term: term,
              year: year,
              start_date: this.generateExamDate(term, year, 'start'),
              end_date: this.generateExamDate(term, year, 'end'),
              registration_deadline: this.generateExamDate(term, year, 'registration'),
              status: this.randomChoice(['Planned', 'Active', 'Completed', 'Cancelled']),
              instructions: this.generateExamInstructions(examType),
              venue_requirements: this.generateVenueRequirements(),
              security_level: this.randomChoice(['Standard', 'High', 'Maximum']),
              supervisor_count: this.randomInt(5, 15),
              invigilator_count: this.randomInt(10, 30),
              total_candidates: this.randomInt(200, 800),
              subjects_count: this.randomInt(8, 15),
              duration_days: this.randomInt(3, 14),
              created_by: this.randomChoice(['Academic Director', 'Principal', 'Deputy Principal']),
              created_at: this.generateTimestamp(365),
              updated_at: this.generateTimestamp(30)
            }
          });
        }
      }
    }

    return results;
  }

  private generateExamDate(term: string, year: string, type: string): string {
    const termMonths = {
      'Term 1': { start: 1, end: 4 },
      'Term 2': { start: 5, end: 8 },
      'Term 3': { start: 9, end: 12 }
    };
    
    const months = termMonths[term as keyof typeof termMonths];
    let month: number;
    
    switch (type) {
      case 'registration':
        month = months.start;
        break;
      case 'start':
        month = months.start + 1;
        break;
      case 'end':
        month = months.end - 1;
        break;
      default:
        month = months.start + 1;
    }
    
    const day = this.randomInt(1, 28);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private generateExamInstructions(examType: string): string[] {
    const commonInstructions = [
      'Arrive 30 minutes before exam time',
      'Bring valid student ID',
      'No electronic devices allowed',
      'Use blue or black pen only',
      'Read all instructions carefully'
    ];
    
    const specificInstructions: { [key: string]: string[] } = {
      'KCSE Trial': [
        'This is a practice for KCSE examination',
        'Strict KNEC regulations apply',
        'No communication with other candidates'
      ],
      'Mock Exam': [
        'Simulates actual KCSE conditions',
        'Time management is crucial',
        'Show all working clearly'
      ]
    };
    
    return [...commonInstructions, ...(specificInstructions[examType] || [])];
  }

  private generateVenueRequirements(): any {
    return {
      minimum_capacity: this.randomInt(30, 50),
      desk_spacing: '1.5 meters',
      lighting: 'Adequate natural or artificial lighting',
      ventilation: 'Proper air circulation required',
      security: 'CCTV monitoring recommended',
      accessibility: 'Wheelchair accessible',
      emergency_exits: 'Clearly marked emergency exits'
    };
  }

  private async generateStudentResults(count: number): Promise<any[]> {
    const results: any[] = [];
    
    // Generate results for different students, subjects, and exam sessions
    for (let i = 1; i <= count; i++) {
      const studentId = this.generateId('stud', this.randomInt(1, 500));
      const subjectId = this.generateId('subj', this.randomInt(1, 50));
      const sessionId = this.generateId('session', this.randomInt(1, 20));
      
      const rawScore = this.randomInt(0, 100);
      const grade = this.calculateGrade(rawScore);
      
      results.push({
        table: 'exam_results',
        data: {
          id: this.generateId('result', i),
          student_id: studentId,
          subject_id: subjectId,
          exam_session_id: sessionId,
          raw_score: rawScore,
          moderated_score: Math.min(100, rawScore + this.randomFloat(-2, 2)),
          grade: grade.grade,
          points: grade.points,
          position_in_class: this.randomInt(1, 40),
          position_in_stream: this.randomInt(1, 120),
          position_in_form: this.randomInt(1, 400),
          class_mean: this.randomFloat(45, 75),
          stream_mean: this.randomFloat(45, 75),
          form_mean: this.randomFloat(45, 75),
          remarks: this.generateResultRemarks(grade.grade),
          teacher_comment: this.generateTeacherComment(grade.grade),
          improvement_areas: this.generateImprovementAreas(),
          strengths: this.generateStrengths(),
          attendance_percentage: this.randomFloat(75, 100),
          effort_grade: this.randomChoice(['Excellent', 'Good', 'Satisfactory', 'Needs Improvement']),
          conduct_grade: this.randomChoice(['Excellent', 'Good', 'Satisfactory', 'Poor']),
          created_at: this.generateTimestamp(90),
          updated_at: this.generateTimestamp(30)
        }
      });
    }
    
    return results;
  }

  private calculateGrade(score: number): { grade: string, points: number } {
    if (score >= 80) return { grade: 'A', points: 12 };
    if (score >= 75) return { grade: 'A-', points: 11 };
    if (score >= 70) return { grade: 'B+', points: 10 };
    if (score >= 65) return { grade: 'B', points: 9 };
    if (score >= 60) return { grade: 'B-', points: 8 };
    if (score >= 55) return { grade: 'C+', points: 7 };
    if (score >= 50) return { grade: 'C', points: 6 };
    if (score >= 45) return { grade: 'C-', points: 5 };
    if (score >= 40) return { grade: 'D+', points: 4 };
    if (score >= 35) return { grade: 'D', points: 3 };
    if (score >= 30) return { grade: 'D-', points: 2 };
    return { grade: 'E', points: 1 };
  }

  private generateResultRemarks(grade: string): string {
    const remarks: { [key: string]: string[] } = {
      'A': ['Excellent performance', 'Outstanding achievement', 'Exceptional work'],
      'A-': ['Very good performance', 'Commendable effort', 'High standard achieved'],
      'B+': ['Good performance', 'Above average work', 'Solid understanding'],
      'B': ['Good work', 'Satisfactory performance', 'Good grasp of concepts'],
      'B-': ['Fair performance', 'Room for improvement', 'Basic understanding shown'],
      'C+': ['Average performance', 'Meets minimum requirements', 'Some understanding evident'],
      'C': ['Below average', 'Needs more effort', 'Basic concepts understood'],
      'C-': ['Poor performance', 'Significant improvement needed', 'Struggling with concepts'],
      'D+': ['Very poor', 'Major improvement required', 'Serious gaps in understanding'],
      'D': ['Failing grade', 'Immediate intervention needed', 'Fundamental concepts missing'],
      'D-': ['Very poor performance', 'Requires intensive support', 'Major learning gaps'],
      'E': ['Unacceptable performance', 'Complete revision needed', 'Failed to demonstrate understanding']
    };
    
    return this.randomChoice(remarks[grade] || remarks['C']);
  }

  private generateTeacherComment(grade: string): string {
    const comments: { [key: string]: string[] } = {
      'A': [
        'Keep up the excellent work!',
        'Outstanding effort and achievement.',
        'Continue with this level of dedication.'
      ],
      'B': [
        'Good work, aim higher next time.',
        'Solid performance, keep improving.',
        'Well done, maintain the momentum.'
      ],
      'C': [
        'Average performance, more effort needed.',
        'You can do better with more practice.',
        'Focus on weak areas for improvement.'
      ],
      'D': [
        'Poor performance, seek extra help.',
        'Immediate improvement required.',
        'Consider additional study time.'
      ],
      'E': [
        'Unacceptable performance, see me urgently.',
        'Major intervention needed immediately.',
        'Requires intensive remedial work.'
      ]
    };
    
    const gradeCategory = grade.charAt(0);
    return this.randomChoice(comments[gradeCategory] || comments['C']);
  }

  private generateImprovementAreas(): string[] {
    const areas = [
      'Time management during exams',
      'Understanding of complex concepts',
      'Application of theoretical knowledge',
      'Problem-solving techniques',
      'Reading comprehension',
      'Mathematical calculations',
      'Essay writing skills',
      'Laboratory techniques',
      'Research methodology',
      'Critical thinking',
      'Attention to detail',
      'Following instructions'
    ];
    
    return this.randomChoices(areas, this.randomInt(1, 3));
  }

  private generateStrengths(): string[] {
    const strengths = [
      'Good understanding of basic concepts',
      'Excellent attendance record',
      'Active participation in class',
      'Strong analytical skills',
      'Good communication skills',
      'Consistent effort',
      'Creative thinking',
      'Leadership qualities',
      'Teamwork abilities',
      'Research skills',
      'Practical application',
      'Time management'
    ];
    
    return this.randomChoices(strengths, this.randomInt(1, 3));
  }

  private async generateTeacherAssignments(count: number): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 1; i <= count; i++) {
      const teacherId = this.generateId('staff', this.randomInt(1, 100));
      const subjectId = this.generateId('subj', this.randomInt(1, 50));
      
      results.push({
        table: 'teacher_subject_assignments',
        data: {
          id: this.generateId('assign', i),
          teacher_id: teacherId,
          subject_id: subjectId,
          academic_year: this.randomChoice(['2023', '2024']),
          term: this.randomChoice(['Term 1', 'Term 2', 'Term 3']),
          class_level: this.randomChoice(['Form 1', 'Form 2', 'Form 3', 'Form 4']),
          stream: this.randomChoice(['A', 'B', 'C', 'D']),
          is_class_teacher: this.randomBoolean(0.2),
          is_head_of_department: this.randomBoolean(0.1),
          teaching_load_hours: this.randomInt(6, 25),
          specialization_level: this.randomChoice(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
          assignment_type: this.randomChoice(['Primary', 'Secondary', 'Substitute']),
          start_date: this.generateTimestamp(365),
          end_date: this.generateTimestamp(-30),
          status: this.randomChoice(['Active', 'Completed', 'Suspended']),
          performance_rating: this.randomFloat(3.0, 5.0),
          student_feedback_score: this.randomFloat(3.5, 5.0),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        }
      });
    }
    
    return results;
  }

  private async generateTimetables(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { name: 'Period 1', start_time: '08:00', end_time: '08:40' },
      { name: 'Period 2', start_time: '08:40', end_time: '09:20' },
      { name: 'Period 3', start_time: '09:20', end_time: '10:00' },
      { name: 'Break', start_time: '10:00', end_time: '10:20' },
      { name: 'Period 4', start_time: '10:20', end_time: '11:00' },
      { name: 'Period 5', start_time: '11:00', end_time: '11:40' },
      { name: 'Period 6', start_time: '11:40', end_time: '12:20' },
      { name: 'Period 7', start_time: '12:20', end_time: '13:00' },
      { name: 'Lunch', start_time: '13:00', end_time: '14:00' },
      { name: 'Period 8', start_time: '14:00', end_time: '14:40' },
      { name: 'Period 9', start_time: '14:40', end_time: '15:20' }
    ];
    
    const forms = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
    const streams = ['A', 'B', 'C', 'D'];
    
    let timetableId = 1;
    for (const form of forms) {
      for (const stream of streams) {
        for (const day of days) {
          for (const period of periods) {
            if (period.name === 'Break' || period.name === 'Lunch') {
              results.push({
                table: 'timetables',
                data: {
                  id: this.generateId('timetable', timetableId++),
                  class_level: form,
                  stream: stream,
                  day_of_week: day,
                  period_name: period.name,
                  start_time: period.start_time,
                  end_time: period.end_time,
                  subject_id: null,
                  teacher_id: null,
                  room_number: null,
                  activity_type: period.name,
                  is_break: true,
                  academic_year: '2024',
                  term: 'Term 1',
                  effective_date: '2024-01-15',
                  created_at: this.generateTimestamp(365),
                  updated_at: this.generateTimestamp(30)
                }
              });
            } else {
              results.push({
                table: 'timetables',
                data: {
                  id: this.generateId('timetable', timetableId++),
                  class_level: form,
                  stream: stream,
                  day_of_week: day,
                  period_name: period.name,
                  start_time: period.start_time,
                  end_time: period.end_time,
                  subject_id: this.generateId('subj', this.randomInt(1, 50)),
                  teacher_id: this.generateId('staff', this.randomInt(1, 100)),
                  room_number: this.randomChoice(['101', '102', '103', '201', '202', '203', 'Lab1', 'Lab2', 'Library']),
                  activity_type: 'Lesson',
                  is_break: false,
                  academic_year: '2024',
                  term: 'Term 1',
                  effective_date: '2024-01-15',
                  notes: this.generateTimetableNotes(),
                  created_at: this.generateTimestamp(365),
                  updated_at: this.generateTimestamp(30)
                }
              });
            }
          }
        }
      }
    }
    
    return results;
  }

  private generateTimetableNotes(): string {
    const notes = [
      'Regular lesson',
      'Double period',
      'Practical session',
      'Revision class',
      'Assessment period',
      'Group work',
      'Project presentation',
      'Field work',
      'Library research',
      'Computer lab session'
    ];
    
    return this.randomChoice(notes);
  }

  private async generateCurriculumStructures(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const curriculumTypes = ['National', 'International', 'Vocational', 'Special Needs'];
    const levels = ['Primary', 'Secondary', 'Advanced'];
    const subjects = ['Mathematics', 'English', 'Science', 'History', 'Geography', 'Art', 'Music', 'Physical Education'];
    
    for (let i = 1; i <= count; i++) {
      results.push({
        table: 'curriculum_structures',
        data: {
          id: this.generateId('curriculum', i),
          name: `${this.randomChoice(curriculumTypes)} ${this.randomChoice(levels)} Curriculum`,
          code: `CURR-${i.toString().padStart(3, '0')}`,
          type: this.randomChoice(curriculumTypes),
          level: this.randomChoice(levels),
          academic_year: this.randomChoice(['2023', '2024']),
          term: this.randomChoice(['Term 1', 'Term 2', 'Term 3']),
          subject_id: this.generateId('subj', this.randomInt(1, 50)),
          subject_name: this.randomChoice(subjects),
          learning_objectives: this.generateLearningObjectives(),
          assessment_criteria: this.generateAssessmentCriteria(),
          duration_weeks: this.randomInt(8, 16),
          prerequisite_skills: this.generatePrerequisiteSkills(),
          resources_required: this.generateResourcesRequired(),
          difficulty_level: this.randomChoice(['Beginner', 'Intermediate', 'Advanced']),
          status: this.randomChoice(['Active', 'Draft', 'Under Review', 'Archived']),
          created_by: this.generateId('staff', this.randomInt(1, 100)),
          approved_by: this.generateId('staff', this.randomInt(1, 100)),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        }
      });
    }
    
    return results;
  }

  private generateLearningObjectives(): string[] {
    const objectives = [
      'Understand fundamental concepts',
      'Apply theoretical knowledge to practical situations',
      'Develop critical thinking skills',
      'Demonstrate problem-solving abilities',
      'Communicate ideas effectively',
      'Work collaboratively in teams',
      'Analyze and interpret data',
      'Create original solutions',
      'Evaluate different perspectives',
      'Synthesize information from multiple sources'
    ];
    
    return this.randomChoices(objectives, this.randomInt(2, 4));
  }

  private generateAssessmentCriteria(): string[] {
    const criteria = [
      'Knowledge and understanding',
      'Application of concepts',
      'Analysis and evaluation',
      'Communication skills',
      'Research methodology',
      'Critical thinking',
      'Problem-solving approach',
      'Creativity and innovation',
      'Collaboration and teamwork',
      'Time management'
    ];
    
    return this.randomChoices(criteria, this.randomInt(2, 4));
  }

  private generatePrerequisiteSkills(): string[] {
    const skills = [
      'Basic literacy skills',
      'Numeracy competence',
      'Computer literacy',
      'Research skills',
      'Communication skills',
      'Time management',
      'Study techniques',
      'Note-taking abilities',
      'Presentation skills',
      'Group work experience'
    ];
    
    return this.randomChoices(skills, this.randomInt(1, 3));
  }

  private generateResourcesRequired(): string[] {
    const resources = [
      'Textbooks and reference materials',
      'Computer and internet access',
      'Laboratory equipment',
      'Art and craft supplies',
      'Audio-visual equipment',
      'Library resources',
      'Field trip arrangements',
      'Guest speaker sessions',
      'Online learning platforms',
      'Assessment tools'
    ];
    
    return this.randomChoices(resources, this.randomInt(2, 4));
  }
}