export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface Organization {
    id: string;
    name: string;
    plan: UserPlan;
    created_at: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    organization_id?: string;
    available_organizations?: { id: string, name: string, role: UserRole }[];
}

export type WorkflowStatus = 'draft' | 'active' | 'archived';

export interface Workflow {
    id: string;
    organization_id: string;
    name: string;
    description: string;
    created_at: string;
    created_by: string;
    status: WorkflowStatus;
    version?: string;
    parent_id?: string;
}

export type ActivityType = 'start' | 'task' | 'decision' | 'end';


export interface Transition {
    id: string;
    workflow_id: string;
    source_id: string;
    target_id: string;
    condition?: string;
    target_name?: string;
}

export type ProcessStatus = 'active' | 'completed' | 'cancelled';

export interface ProcessInstance {
    id: string;
    organization_id: string;
    workflow_id: string;
    name: string;
    status: ProcessStatus;
    current_activity_id: string;
    created_at: string;
    created_by: string;
    assigned_user_id?: string;
    assigned_department_id?: string;
    assigned_position_id?: string;
    process_number?: number;
}

export interface ProcessHistory {
    id: string;
    process_id: string;
    activity_id: string;
    action: 'started' | 'completed' | 'commented';
    comment?: string;
    data?: any;
    created_at: string;
    user_id: string;
}

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'provider' | 'select' | 'email' | 'currency' | 'textarea' | 'phone';

export interface FieldDefinition {
    id: string;
    activity_id: string;
    name: string;
    label?: string;
    type: FieldType;
    required: boolean;
    placeholder?: string;
    description?: string;
    options?: string[]; // For select type, stored as JSON string or array
    min_value?: number;
    max_value?: number;
    regex_pattern?: string;
    source_activity_id?: string;
    source_field_name?: string;
    order_index?: number;
    visibility_condition?: string; // Logic to show/hide field based on other field values
}

export interface ActivityField {
    id: string;
    process_id: string;
    activity_id: string;
    field_name: string;
    value: string;
}

// Single updated Activity interface
export interface Activity {
    id: string;
    workflow_id: string;
    name: string;
    description?: string;
    type: ActivityType;
    x_pos: number;
    y_pos: number;
    width?: number;
    height?: number;
    // x and y might be deprecated or used by some other lib, keeping optional or removing?
    // Let's keep them optional to avoid breaking if used elsewhere, but marked
    x?: number;
    y?: number;
    fields?: FieldDefinition[];
    due_date_hours?: number; // Hours before activity is considered overdue (default: 24)
    form_columns?: number;
    assignment_type?: AssignmentType;
    assignment_strategy?: AssignmentStrategy;
    assigned_position_id?: string;
    assigned_department_id?: string;
    assigned_user_id?: string;
    action_type?: 'none' | 'webhook' | 'soap' | 'finance';
    action_config?: {
        steps?: {
            id: string;
            url: string;
            method: string;
            headers?: Record<string, string>;
            body?: string;
            auth_type?: 'none' | 'bearer' | 'basic';
            auth_token?: string;
            output_variable?: string; // e.g. "access_token" to be used in next steps as {{access_token}}
        }[];
        url?: string; // Keep for backward compatibility of single step
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        auth_type?: 'none' | 'bearer' | 'basic';
        auth_token?: string;
        output_variable?: string;
        // Finance integration fields
        finance_url?: string;
        api_key?: string;
        amount?: string;
        description?: string;
        movement_type?: 'expense' | 'income';
        category?: string;
        provider?: string;
        concept_id?: string;
    };
}

export interface Provider {
    id: string;
    organization_id: string;
    name: string;
    tax_id?: string;
    email?: string;
    phone?: string;
    address?: string;
    created_at: string;
}

// Organizational Chart Types
export interface Department {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    parent_department_id?: string;
    allocation_percentage?: number; // % de reparto de ingresos
    allocation_rules?: string; // Reglas personalizadas de reparto
    created_at: string;
    updated_at: string;
}

export interface Position {
    id: string;
    organization_id: string;
    department_id?: string;
    title: string;
    description?: string;
    level: number;
    reports_to_position_id?: string;
    created_at: string;
    updated_at: string;
}

export interface EmployeePosition {
    id: string;
    user_id: string;
    position_id: string;
    is_primary: boolean;
    start_date: string;
    end_date?: string;
    created_at: string;
}

export type AssignmentType = 'manual' | 'position' | 'department' | 'specific_user' | 'creator';
export type AssignmentStrategy = 'manual' | 'workload' | 'efficiency' | 'random';

export interface DepartmentWithChildren extends Department {
    children?: DepartmentWithChildren[];
    positions?: Position[];
}

export interface PositionWithEmployees extends Position {
    employees?: {
        user_id: string;
        user_name?: string;
        user_email?: string;
        is_primary: boolean;
    }[];
    department?: Department;
}

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'custom_days';

export interface ScheduledProcess {
    id: string;
    organization_id: string;
    workflow_id: string;
    name: string;
    scheduled_at: string;
    is_recurring: boolean;
    recurrence_pattern: RecurrencePattern;
    recurrence_interval?: number; // e.g., every 8 days
    last_run_at?: string;
    created_at: string;
    created_by: string;
    status: 'pending' | 'cancelled' | 'active';
}
