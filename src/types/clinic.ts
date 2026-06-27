export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Arrived'
  | 'Waiting'
  | 'In Consultation'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export type PaymentMethod = 'Cash' | 'Card' | 'Transfer' | 'Other';
export type Gender = 'Female' | 'Male' | 'Other';

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  age: number;
  gender: Gender;
  address: string;
  medicalNotes: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Appointment {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  serviceId?: string;
  serviceName?: string;
  serviceCategory?: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes: string;
  treatmentPerformed: string;
  revenueAmount: number;
  depositAmount?: number;
  paid: boolean;
  paymentMethod: PaymentMethod;
  recurrenceRule?: 'none' | 'weekly' | 'monthly';
  recurrenceCount?: number;
  recurringGroupId?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  amount: number;
  method: PaymentMethod;
  paid: boolean;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Treatment {
  id: string;
  name: string;
  defaultPrice: number;
  notes: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  defaultDuration: number;
  defaultPrice: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineNote {
  id: string;
  patientId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: 'appointment' | 'patient' | 'payment' | 'settings' | 'backup' | 'service' | 'treatment' | 'note';
  entityId: string;
  details: string;
  createdAt: string;
}

export interface ClinicBackup {
  exportedAt: string;
  patients: Patient[];
  appointments: Appointment[];
  payments: Payment[];
  treatments: Treatment[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  settings: Record<string, unknown>[];
  timelineNotes: TimelineNote[];
  auditLogs: AuditLog[];
}
