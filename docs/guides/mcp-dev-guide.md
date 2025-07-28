# Message Campaigns Page (MCP) Development Guide

## 1. Overview

The Message Campaigns Page (MCP) is part of the Administration module and allows users to create, manage, and schedule communication campaigns via different channels (SMS, Email, Push Notification - though channel implementation is conceptual for now).

This guide outlines the key aspects for developers working on or extending this feature.

## 2. Core Files Involved

*   **Page Component**: `src/pages/administration/MessageCampaignsPage.tsx`
*   **Type Definitions**:
    *   `Campaign`: Main entity for a message campaign.
    *   `TemplateComm`: Entity for communication templates that can be used in campaigns.
    *   `CampaignStatus`: Enum for campaign lifecycle.
    *   `CampaignAudienceType`: Enum for defining target audiences.
    *   `TemplateType`: Enum for template types (SMS, Email, etc.).
    (All defined in `src/types.ts`)
*   **Data Context**: `src/contexts/AppDataContext.tsx` (accessed via `useAppData`)
*   **Data Hooks**:
    *   `src/hooks/useMockData.ts` (for demo mode implementation)
    *   `src/hooks/useRxDBData.ts` (for production mode implementation)
*   **UI Components**: Standard components from `src/components/ui/` (e.g., `Card`, `Table`, `Button`, `Modal`, `Input`, `Select`, `Textarea`).

## 3. Data Flow and Management

### 3.1. Entities

*   **`Campaign`**:
    *   `id`: Unique identifier.
    *   `name`: Name of the campaign.
    *   `template_id?`: Optional ID of a `TemplateComm` used.
    *   `subject?`: Subject line (for Email/Push).
    *   `body?`: Custom message body if not using a template, or pre-filled from template.
    *   `status`: Current status (Draft, Approved, Scheduled, Sent, Cancelled).
    *   `target_audience_type?`: Defines the target group (e.g., All Students, Specific Class).
    *   `target_id?`: ID related to `target_audience_type` (e.g., ClassStream ID).
    *   `scheduled_for?`: ISO date-time string for scheduled sending.
    *   `sent_at?`: ISO date-time string when sent.
    *   `created_by`: User ID of the creator.
    *   `approved_by?`: User ID of the approver.
    *   Denormalized fields: `template_name`, `created_by_name`, `approved_by_name`, `target_audience_display`.
*   **`TemplateComm`**:
    *   `id`: Unique identifier.
    *   `name`: Name of the template.
    *   `type`: SMS, Email, Push Notification.
    *   `subject?`: Subject for Email/Push.
    *   `body_template`: The template content with placeholders.

### 3.2. Data Operations

All data operations are performed via functions obtained from `useAppData()`:

*   `campaigns: Campaign[]`: List of all campaigns.
*   `templatesComm: TemplateComm[]`: List of available communication templates.
*   `classStreams: ClassStream[]`: Used for targeting specific classes/streams.
*   `addCampaign(data): Promise<Campaign>`
*   `updateCampaign(updatedData): Promise<Campaign>`
*   `deleteCampaign(campaignId): Promise<void>`

## 4. Key Features of `MessageCampaignsPage.tsx`

### 4.1. Displaying Campaigns

*   Uses the `Table` component to list existing campaigns.
*   Columns include Name, Status, Template Used, Target Audience, Scheduled Time, Creator.
*   Action buttons for "Edit" and "Delete".

### 4.2. Creating and Editing Campaigns (Modal)

*   A `Modal` is used for both creating new campaigns and editing existing ones.
*   **Form Fields**:
    *   Campaign Name (Input)
    *   Communication Template (Select - Optional): Populates Subject and Body if selected.
    *   Subject (Input - visible/required based on template type or if no template)
    *   Target Audience Type (Select)
    *   Target ID (Select - e.g., ClassStream, dynamically shown based on Audience Type)
    *   Schedule For (Input type `datetime-local`)
    *   Status (Select)
    *   Body Content (Textarea): Supports placeholders like `{{student_name}}`.
*   **Logic**:
    *   When a template is selected, its subject and body are pre-filled into the form.
    *   The `target_id` field's options change based on the `target_audience_type`.
    *   User ID of the current user (from `useUser()`) is used for `created_by`.

### 4.3. Placeholders

*   The page includes a note about available placeholders (e.g., `{{student_name}}`, `{{parent_name}}`, `{{balance}}`).
*   The actual replacement of these placeholders would typically happen on a backend or a dedicated sending service before dispatch. In the current frontend-only model, this is a conceptual feature for template design.

## 5. Development Guidelines

### 5.1. Adding New Target Audience Types

1.  **Update `CampaignAudienceType` enum** in `types.ts`.
2.  **Modify `MessageCampaignsPage.tsx`**:
    *   Add new case in the `Select` for `target_audience_type`.
    *   If the new type requires a specific `target_id` (e.g., selecting a department), add another `Select` component that becomes visible when this audience type is chosen. Populate its options from the relevant data source (e.g., `departments` from `useAppData()`).
3.  **Update Data Hooks (`useMockData.ts` / `useRxDBData.ts`)**:
    *   Ensure the `addCampaign` and `updateCampaign` functions can handle the new `target_audience_type` and `target_id`.
    *   The mock data hook should correctly denormalize `target_audience_display`.

### 5.2. Implementing Actual Sending Logic (Future)

Currently, the app only manages campaign creation and scheduling conceptually. To implement actual sending:

*   A backend service would be required.
*   The `status` field would transition to "Sending" then "Sent" or "Failed".
*   The backend would handle placeholder replacement and integration with SMS/Email gateways.

### 5.3. Enhancing Template Placeholder System

*   A more robust system might involve fetching available placeholders based on the selected audience type.
*   Live preview of the message with placeholders filled with sample data.

## 6. Testing Considerations

*   Test creating campaigns with and without templates.
*   Test all target audience types, ensuring the `target_id` selector behaves correctly.
*   Verify that editing a campaign pre-fills the form correctly.
*   Check status changes and their reflection in the UI.
*   Ensure form validation (required fields) works as expected.

This guide provides a starting point for understanding and developing the Message Campaigns feature. Always refer to `types.ts` for data structures and `AppDataContextType` for the available data operations.