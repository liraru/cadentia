export interface UserProfile {
  user_id: string;
  name: string;
  height: number | null; // metros
  target: number | null; // peso objetivo en kg
}

export interface WeightRecord {
  record_id: number;
  user_id: string;
  date: string; // yyyy-mm-dd
  weight: number; // kg
  imc: number | null;
  waist: number | null; // cm
  thigh: number | null;
  chest: number | null;
  arm: number | null;
}

export type WeightRecordInput = Omit<WeightRecord, 'record_id' | 'user_id'>;
