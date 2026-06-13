import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import type { Appointment, AuditLog, ClinicBackup, Patient, Payment, Service, ServiceCategory, TimelineNote, Treatment } from '../types/clinic';

export const statuses = [
  'Scheduled',
  'Confirmed',
  'Arrived',
  'Waiting',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
] as const;

export const durationOptions = [15, 30, 45, 60, 90, 120, 0];
export const paymentMethods = ['Cash', 'Card', 'Transfer', 'Other'] as const;
export const softDeleteCollections = ['patients', 'appointments', 'services', 'treatments'] as const;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}`);
}

export function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function formatMad(amount: number) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);
}

export function makePatientId(count: number) {
  return `PAT-${String(count + 1).padStart(4, '0')}`;
}

export function makeAppointmentId(count: number, date = new Date()) {
  return `APT-${date.getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export function overlaps(
  candidate: Pick<Appointment, 'id' | 'date' | 'time' | 'duration'>,
  appointments: Appointment[],
) {
  const start = toDateTime(candidate.date, candidate.time).getTime();
  const end = start + candidate.duration * 60000;
  return appointments.some((item) => {
    if (item.id === candidate.id || item.date !== candidate.date || ['Cancelled', 'No Show'].includes(item.status)) {
      return false;
    }
    const itemStart = toDateTime(item.date, item.time).getTime();
    const itemEnd = itemStart + item.duration * 60000;
    return start < itemEnd && end > itemStart;
  });
}

export async function getCollection<T>(name: string): Promise<T[]> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function getSettingsBackup() {
  const snap = await getDocs(collection(db, 'settings'));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createAudit(action: string, entity: AuditLog['entity'], entityId: string, details: string) {
  await addDoc(collection(db, 'audit_logs'), { action, entity, entityId, details, createdAt: nowIso() });
}

export async function upsertPatient(patient: Patient, isNew: boolean) {
  await setDoc(doc(db, 'patients', patient.id), patient);
  await createAudit(isNew ? 'Patient created' : 'Patient edited', 'patient', patient.patientId, patient.name);
}

export async function upsertAppointment(appointment: Appointment, isNew: boolean) {
  await setDoc(doc(db, 'appointments', appointment.id), appointment);
  await createAudit(
    isNew ? 'Appointment created' : 'Appointment edited',
    'appointment',
    appointment.appointmentId,
    `${appointment.patientName} on ${appointment.date} ${appointment.time}`,
  );
}

export async function removeAppointment(appointment: Appointment) {
  await softDelete('appointments', appointment.id, appointment.appointmentId, 'appointment', appointment.patientName);
  await createAudit('Appointment deleted', 'appointment', appointment.appointmentId, appointment.patientName);
}

export async function upsertService(service: Service, isNew: boolean) {
  await setDoc(doc(db, 'services', service.id), service);
  await createAudit(isNew ? 'Service created' : 'Service edited', 'service', service.id, service.name);
}

export async function upsertServiceCategory(category: ServiceCategory, isNew: boolean) {
  await setDoc(doc(db, 'service_categories', category.id), category);
  await createAudit(isNew ? 'Service category created' : 'Service category edited', 'service', category.id, category.name);
}

export async function upsertTimelineNote(note: TimelineNote, isNew: boolean) {
  await setDoc(doc(db, 'note_timeline', note.id), note);
  await createAudit(isNew ? 'Timeline note created' : 'Timeline note edited', 'note', note.patientId, note.text);
}

export async function deleteTimelineNote(note: TimelineNote) {
  await deleteDoc(doc(db, 'note_timeline', note.id));
  await createAudit('Timeline note deleted', 'note', note.patientId, note.text);
}

export async function addPayment(payment: Payment) {
  await setDoc(doc(db, 'payments', payment.id), payment);
  await createAudit('Payment added', 'payment', payment.id, `${payment.patientName} paid ${payment.amount} DH`);
}

export async function exportBackup(data: Omit<ClinicBackup, 'exportedAt'>) {
  return JSON.stringify({ exportedAt: nowIso(), ...data }, null, 2);
}

export function downloadFile(name: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

export function exportExcel(backup: ClinicBackup) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.patients), 'Patients');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.appointments), 'Appointments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.payments), 'Payments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.treatments), 'Treatments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.services), 'Services');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.timelineNotes), 'Notes Timeline');
  XLSX.writeFile(wb, `dr123-backup-${todayIso()}.xlsx`);
}

export async function importBackup(backup: ClinicBackup) {
  const batch = writeBatch(db);
  backup.patients?.forEach((item) => batch.set(doc(db, 'patients', item.id), item));
  backup.appointments?.forEach((item) => batch.set(doc(db, 'appointments', item.id), item));
  backup.payments?.forEach((item) => batch.set(doc(db, 'payments', item.id), item));
  backup.treatments?.forEach((item: Treatment) => batch.set(doc(db, 'treatments', item.id), item));
  backup.services?.forEach((item) => batch.set(doc(db, 'services', item.id), item));
  backup.serviceCategories?.forEach((item) => batch.set(doc(db, 'service_categories', item.id), item));
  backup.timelineNotes?.forEach((item) => batch.set(doc(db, 'note_timeline', item.id), item));
  backup.auditLogs?.forEach((item) => batch.set(doc(db, 'audit_logs', item.id), item));
  await batch.commit();
  await createAudit('Backup imported', 'backup', `backup-${Date.now()}`, `Imported ${backup.exportedAt}`);
}

export async function patchAppointment(id: string, data: Partial<Appointment>) {
  await updateDoc(doc(db, 'appointments', id), { ...data, updatedAt: nowIso() });
}

export async function softDelete(
  collectionName: string,
  id: string,
  entityId: string,
  entity: AuditLog['entity'],
  details: string,
) {
  await updateDoc(doc(db, collectionName, id), { deleted: true, deletedAt: nowIso(), updatedAt: nowIso() });
  await createAudit(`${entity} moved to recycle bin`, entity, entityId, details);
}

export async function restoreItem(collectionName: string, id: string, entity: AuditLog['entity'], entityId: string) {
  await updateDoc(doc(db, collectionName, id), { deleted: false, deletedAt: '', updatedAt: nowIso() });
  await createAudit(`${entity} restored`, entity, entityId, `Restored ${id}`);
}

export async function permanentlyDelete(collectionName: string, id: string, entity: AuditLog['entity'], entityId: string) {
  await deleteDoc(doc(db, collectionName, id));
  await createAudit(`${entity} permanently deleted`, entity, entityId, `Deleted ${id}`);
}

export async function purgeOldDeleted(items: Array<{ collectionName: string; id: string; deletedAt?: string; entity: AuditLog['entity']; entityId: string }>) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await Promise.all(
    items
      .filter((item) => item.deletedAt && new Date(item.deletedAt).getTime() < cutoff)
      .map((item) => permanentlyDelete(item.collectionName, item.id, item.entity, item.entityId)),
  );
}

export async function getSettingDocument(id: string) {
  const snap = await getDoc(doc(db, 'settings', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
