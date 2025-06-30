export type TransactionAction = 'join' | 'leave' | 'inactive';

export interface TeamTransaction {
  date: string;
  action: TransactionAction;
  player: {
    id: string;
    url: string;
    alias: string;
    realName: string;
    countryCode: string;
  };
  position: string;
  referenceUrl?: string;
} 
