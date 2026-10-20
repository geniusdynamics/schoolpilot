// ABOUTME: Generated from entity.schema.json by codegen.mjs; do not edit by hand.
// ABOUTME: Stand-in for a mature JSON Schema codegen tool in the DR-01 spike.

export interface Learner {
  id: string;
  institution_id: string;
  admission_number: string;
  given_name: string;
  middle_names?: Array<string>;
  family_name: string;
  gender: "female" | "male" | "other" | "not_stated";
  date_of_birth?: string;
  status: "applicant" | "enrolled" | "suspended" | "withdrawn" | "transferred_out" | "graduated" | "deceased";
  residence_status: "day" | "boarder" | "weekly_boarder";
  house_id?: string;
  special_needs?: Array<string>;
  attributes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Enrolment {
  id: string;
  learner_id: string;
  academic_year_id: string;
  programme_id: string;
  level_id: string;
  class_group_id: string;
  pathway_id?: string;
  status: "active" | "repeating" | "left" | "completed";
  start_date: string;
  end_date?: string;
  entry_reason: "new_admission" | "promoted" | "repeated" | "transferred_in" | "re_admitted";
  exit_reason?: "promoted" | "graduated" | "transferred_out" | "withdrawn" | "expelled" | "deceased";
  fee_category_ids?: Array<string>;
  sponsorship_id?: string;
  created_at: string;
  updated_at: string;
}

export const storage = {
  learner: {"table":"learner","primaryKey":"id","indexes":["institution_id","status","house_id"],"unique":[["institution_id","admission_number"]],"refs":{"institution_id":"institution","house_id":"house"},"encrypted":["attributes"]},
  enrolment: {"table":"enrolment","primaryKey":"id","indexes":["learner_id","academic_year_id","class_group_id","level_id","status"],"unique":[],"refs":{"learner_id":"learner","academic_year_id":"academic_year","programme_id":"programme","level_id":"level","class_group_id":"class_group","pathway_id":"pathway","sponsorship_id":"sponsorship"},"encrypted":[]},
} as const;
