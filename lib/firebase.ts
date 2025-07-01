import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, where, enableNetwork, disableNetwork } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBON9iQ1eYmVYFIdQ9BN7pQy964-LDKYuo",
  authDomain: "my-days-599be.firebaseapp.com",
  projectId: "my-days-599be",
  storageBucket: "my-days-599be.firebasestorage.app",
  messagingSenderId: "325492369748",
  appId: "1:325492369748:web:ffd071198eb5a85a2d40c1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Collection names
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  WORK_DAYS: 'workDays',
  PAYMENTS: 'payments',
  DAY_NOTES: 'dayNotes'
} as const;

// Payment types
export const PAYMENT_TYPES = [
  'Bank Transfer',
  'PayPal',
  'Cash',
  'Other'
] as const;

export type PaymentType = typeof PAYMENT_TYPES[number];

// Import types from store to maintain consistency
import type { Employee, WorkDay, Payment, DayNote } from './store'

// Firebase service functions with enhanced error handling
export const firebaseService = {
  // Employee functions
  async addEmployee(employee: Employee) {
    try {
      await setDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), employee);
      return { success: true };
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  },

  async getEmployees(): Promise<Employee[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
      return querySnapshot.docs.map(doc => doc.data() as Employee);
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  },

  async deleteEmployee(employeeId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.EMPLOYEES, employeeId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  // Work day functions
  async addWorkDay(workDay: WorkDay) {
    try {
      await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), workDay);
      return { success: true };
    } catch (error) {
      console.error('Error adding work day:', error);
      throw error;
    }
  },

  async getWorkDays(): Promise<WorkDay[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
      return querySnapshot.docs.map(doc => doc.data() as WorkDay);
    } catch (error) {
      console.error('Error getting work days:', error);
      throw error;
    }
  },

  async deleteWorkDaysForEmployee(employeeId: string) {
    try {
      const q = query(collection(db, COLLECTIONS.WORK_DAYS), where("employeeId", "==", employeeId));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      console.error('Error deleting work days for employee:', error);
      throw error;
    }
  },

  // Payment functions
  async addPayment(payment: Payment) {
    try {
      await setDoc(doc(db, COLLECTIONS.PAYMENTS, payment.id), payment);
      return { success: true };
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  },

  async getPayments(): Promise<Payment[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
      return querySnapshot.docs.map(doc => doc.data() as Payment);
    } catch (error) {
      console.error('Error getting payments:', error);
      throw error;
    }
  },

  async getPaymentsForEmployee(employeeId: string): Promise<Payment[]> {
    try {
      const q = query(collection(db, COLLECTIONS.PAYMENTS), where("employeeId", "==", employeeId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Payment);
    } catch (error) {
      console.error('Error getting payments for employee:', error);
      throw error;
    }
  },

  async deletePayment(paymentId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  async deletePaymentsForEmployee(employeeId: string) {
    try {
      const q = query(collection(db, COLLECTIONS.PAYMENTS), where("employeeId", "==", employeeId));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      console.error('Error deleting payments for employee:', error);
      throw error;
    }
  },

  async deleteAllPayments() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return { success: true };
    } catch (error) {
      console.error('Error deleting all payments:', error);
      throw error;
    }
  },

  // ROBUST PAYMENT OPERATIONS - These maintain data integrity
  
  /**
   * Creates a payment record and marks work days as paid atomically
   * This is the ONLY safe way to mark work days as paid
   * Includes proper rollback on failure
   */
  async createPaymentAndMarkWorkDays(
    employeeId: string, 
    workDayIds: string[], 
    amount: number,
    paymentType: PaymentType,
    notes?: string,
    paymentDate?: string
  ): Promise<{ payment: Payment; success: boolean }> {
    let paymentCreated = false;
    let payment: Payment | null = null;
    const originalWorkDayStates: Array<{ id: string; paid: boolean }> = [];

    try {
      console.log('Creating payment and marking work days as paid...', {
        employeeId,
        workDayIds,
        amount,
        paymentType
      });

      // 1. Get current work days and store their original states for rollback
      const workDaysSnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
      const allWorkDays = workDaysSnapshot.docs.map(doc => doc.data() as WorkDay);
      const workDaysToUpdate = allWorkDays.filter(wd => workDayIds.includes(wd.id));
      
      // Validate that all work days exist and are worked
      if (workDaysToUpdate.length !== workDayIds.length) {
        throw new Error(`Some work days not found. Expected ${workDayIds.length}, found ${workDaysToUpdate.length}`);
      }

      const unworkedDays = workDaysToUpdate.filter(wd => !wd.worked);
      if (unworkedDays.length > 0) {
        throw new Error(`Cannot mark unworked days as paid: ${unworkedDays.map(wd => wd.date).join(', ')}`);
      }

      // Store original states for rollback
      workDaysToUpdate.forEach(wd => {
        originalWorkDayStates.push({ id: wd.id, paid: wd.paid });
      });

      // 2. Mark work days as paid FIRST (easier to rollback)
      const updatePromises = workDaysToUpdate.map(async (workDay) => {
        const updatedWorkDay: WorkDay = { ...workDay, paid: true };
        await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), updatedWorkDay);
        console.log('Work day marked as paid:', workDay.id);
      });

      await Promise.all(updatePromises);
      console.log('All work days marked as paid successfully');

      // 3. Create payment record AFTER work days are updated
      const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      payment = {
        id: paymentId,
        employeeId,
        workDayIds,
        amount,
        paymentType,
        date: paymentDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        ...(notes?.trim() && { notes: notes.trim() })
      };

      await setDoc(doc(db, COLLECTIONS.PAYMENTS, payment.id), payment);
      paymentCreated = true;
      console.log('Payment record created:', payment.id);

      return { payment, success: true };
    } catch (error) {
      console.error('Error creating payment and marking work days:', error);
      
      // ROLLBACK: Restore original work day states if something failed
      if (originalWorkDayStates.length > 0) {
        console.log('Rolling back work day changes...');
        try {
          const rollbackPromises = originalWorkDayStates.map(async ({ id, paid }) => {
            const workDaysSnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
            const allWorkDays = workDaysSnapshot.docs.map(doc => doc.data() as WorkDay);
            const workDay = allWorkDays.find(wd => wd.id === id);
            if (workDay) {
              const restoredWorkDay: WorkDay = { ...workDay, paid };
              await setDoc(doc(db, COLLECTIONS.WORK_DAYS, id), restoredWorkDay);
              console.log('Rolled back work day:', id, 'to paid:', paid);
            }
          });
          await Promise.all(rollbackPromises);
          console.log('Work day rollback completed');
        } catch (rollbackError) {
          console.error('Failed to rollback work day changes:', rollbackError);
          // Log this for manual cleanup
          console.error('MANUAL CLEANUP NEEDED: Work days may be in inconsistent state:', originalWorkDayStates);
        }
      }

      // ROLLBACK: Delete payment record if it was created but work days failed
      if (paymentCreated && payment) {
        console.log('Rolling back payment record...');
        try {
          await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, payment.id));
          console.log('Payment record rollback completed');
        } catch (rollbackError) {
          console.error('Failed to rollback payment record:', rollbackError);
          console.error('MANUAL CLEANUP NEEDED: Payment record may exist without corresponding paid work days:', payment.id);
        }
      }

      throw new Error(`Failed to process payment atomically: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Safely unmarks work days as paid - with validation for existing payment records
   */
  async unmarkWorkDaysAsPaid(workDayIds: string[]): Promise<{ 
    success: boolean; 
    affectedPayments: Payment[];
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
  }> {
    try {
      console.log('Checking for payment records before unmarking work days...', workDayIds);

      // 1. Find all payments that include these work days
      const paymentsSnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
      const allPayments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
      
      const affectedPayments = allPayments.filter(payment => 
        payment.workDayIds.some(wdId => workDayIds.includes(wdId))
      );

      if (affectedPayments.length > 0) {
        // There are existing payment records - this requires user confirmation
        const paymentDescriptions = affectedPayments.map(p => 
          `£${p.amount.toFixed(2)} paid on ${p.date} (${p.paymentType})`
        ).join(', ');

        return {
          success: false,
          affectedPayments,
          requiresConfirmation: true,
          confirmationMessage: `This will affect existing payment records: ${paymentDescriptions}. The payment records will need to be updated or deleted. Are you sure?`
        };
      }

      // 2. No payment records found - safe to unmark
      const workDaysSnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
      const allWorkDays = workDaysSnapshot.docs.map(doc => doc.data() as WorkDay);
      const workDaysToUpdate = allWorkDays.filter(wd => workDayIds.includes(wd.id));

      const updatePromises = workDaysToUpdate.map(async (workDay) => {
        const updatedWorkDay: WorkDay = { ...workDay, paid: false };
        await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), updatedWorkDay);
      });

      await Promise.all(updatePromises);
      console.log('Work days unmarked as paid successfully');

      return { success: true, affectedPayments: [] };
    } catch (error) {
      console.error('Error unmarking work days as paid:', error);
      throw error;
    }
  },

  /**
   * Force unmarks work days and handles payment records appropriately
   */
  async forceUnmarkWorkDaysAsPaid(
    workDayIds: string[], 
    paymentHandling: 'delete' | 'update' = 'update'
  ): Promise<{ success: boolean; deletedPayments: string[]; updatedPayments: Payment[] }> {
    try {
      console.log('Force unmarking work days as paid...', { workDayIds, paymentHandling });

      const deletedPayments: string[] = [];
      const updatedPayments: Payment[] = [];

      // 1. Handle existing payment records
      const paymentsSnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
      const allPayments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
      
      const affectedPayments = allPayments.filter(payment => 
        payment.workDayIds.some(wdId => workDayIds.includes(wdId))
      );

      for (const payment of affectedPayments) {
        const remainingWorkDayIds = payment.workDayIds.filter(wdId => !workDayIds.includes(wdId));
        
        if (remainingWorkDayIds.length === 0 || paymentHandling === 'delete') {
          // Delete the entire payment record
          await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, payment.id));
          deletedPayments.push(payment.id);
          console.log('Deleted payment record:', payment.id);
        } else {
          // Update payment to remove the work days being unmarked
          const updatedPayment: Payment = {
            ...payment,
            workDayIds: remainingWorkDayIds,
            amount: remainingWorkDayIds.length * (payment.amount / payment.workDayIds.length) // Proportional amount
          };
          await setDoc(doc(db, COLLECTIONS.PAYMENTS, payment.id), updatedPayment);
          updatedPayments.push(updatedPayment);
          console.log('Updated payment record:', payment.id);
        }
      }

      // 2. Unmark work days as paid
      const workDaysSnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
      const allWorkDays = workDaysSnapshot.docs.map(doc => doc.data() as WorkDay);
      const workDaysToUpdate = allWorkDays.filter(wd => workDayIds.includes(wd.id));

      const updatePromises = workDaysToUpdate.map(async (workDay) => {
        const updatedWorkDay: WorkDay = { ...workDay, paid: false };
        await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), updatedWorkDay);
      });

      await Promise.all(updatePromises);
      console.log('Work days unmarked as paid successfully');

      return { success: true, deletedPayments, updatedPayments };
    } catch (error) {
      console.error('Error force unmarking work days as paid:', error);
      throw error;
    }
  },

  /**
   * Validates payment data integrity - checks for orphaned records
   */
  async validatePaymentIntegrity(): Promise<{
    isValid: boolean;
    orphanedWorkDays: WorkDay[]; // Work days marked as paid but no payment record
    orphanedPayments: Payment[]; // Payment records for work days not marked as paid
    issues: string[];
  }> {
    try {
      console.log('Validating payment data integrity...');

      const [workDaysSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.WORK_DAYS)),
        getDocs(collection(db, COLLECTIONS.PAYMENTS))
      ]);

      const allWorkDays = workDaysSnapshot.docs.map(doc => doc.data() as WorkDay);
      const allPayments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);

      const orphanedWorkDays: WorkDay[] = [];
      const orphanedPayments: Payment[] = [];
      const issues: string[] = [];

      // Find work days marked as paid but no payment record exists
      const paidWorkDays = allWorkDays.filter(wd => wd.paid);
      for (const workDay of paidWorkDays) {
        const hasPaymentRecord = allPayments.some(payment => 
          payment.workDayIds.includes(workDay.id)
        );
        if (!hasPaymentRecord) {
          orphanedWorkDays.push(workDay);
          issues.push(`Work day ${workDay.id} (${workDay.date}) is marked as paid but has no payment record`);
        }
      }

      // Find payment records for work days not marked as paid
      for (const payment of allPayments) {
        const unpaidWorkDaysInPayment = payment.workDayIds.filter(wdId => {
          const workDay = allWorkDays.find(wd => wd.id === wdId);
          return workDay && !workDay.paid;
        });
        
        if (unpaidWorkDaysInPayment.length > 0) {
          orphanedPayments.push(payment);
          issues.push(`Payment ${payment.id} includes work days that are not marked as paid: ${unpaidWorkDaysInPayment.join(', ')}`);
        }
      }

      const isValid = orphanedWorkDays.length === 0 && orphanedPayments.length === 0;
      
      console.log('Payment integrity validation result:', {
        isValid,
        orphanedWorkDays: orphanedWorkDays.length,
        orphanedPayments: orphanedPayments.length,
        issues: issues.length
      });

      return { isValid, orphanedWorkDays, orphanedPayments, issues };
    } catch (error) {
      console.error('Error validating payment integrity:', error);
      throw error;
    }
  },

  /**
   * Repairs payment data integrity issues
   */
  async repairPaymentIntegrity(): Promise<{ success: boolean; repairActions: string[] }> {
    try {
      console.log('Repairing payment data integrity...');
      
      const validation = await this.validatePaymentIntegrity();
      const repairActions: string[] = [];

      if (validation.isValid) {
        return { success: true, repairActions: ['No repairs needed - data is already consistent'] };
      }

      // Repair orphaned work days (marked as paid but no payment record)
      if (validation.orphanedWorkDays.length > 0) {
        for (const workDay of validation.orphanedWorkDays) {
          const updatedWorkDay: WorkDay = { ...workDay, paid: false };
          await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), updatedWorkDay);
          repairActions.push(`Unmarked orphaned work day ${workDay.id} as unpaid`);
        }
      }

      // Repair orphaned payments (payment records for unpaid work days)
      if (validation.orphanedPayments.length > 0) {
        for (const payment of validation.orphanedPayments) {
          // Get current work days
          const workDaysSnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
          const allWorkDays = workDaysSnapshot.docs.map(doc => doc.data() as WorkDay);
          
          // Mark work days as paid to match the payment record
          const workDaysToUpdate = allWorkDays.filter(wd => payment.workDayIds.includes(wd.id));
          for (const workDay of workDaysToUpdate) {
            const updatedWorkDay: WorkDay = { ...workDay, paid: true };
            await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), updatedWorkDay);
          }
          repairActions.push(`Marked work days as paid to match payment record ${payment.id}`);
        }
      }

      console.log('Payment integrity repair completed:', repairActions);
      return { success: true, repairActions };
    } catch (error) {
      console.error('Error repairing payment integrity:', error);
      throw error;
    }
  },

  // Day notes functions
  async addDayNote(dayNote: DayNote) {
    try {
      console.log('Firebase: Adding day note to collection:', COLLECTIONS.DAY_NOTES)
      console.log('Firebase: Day note data:', dayNote)
      console.log('Firebase: Document ID:', dayNote.id)
      
      await setDoc(doc(db, COLLECTIONS.DAY_NOTES, dayNote.id), dayNote);
      console.log('Firebase: Day note saved successfully')
      return { success: true };
    } catch (error) {
      console.error('Firebase: Error adding day note:', error)
      console.error('Firebase: Error details:', {
        code: (error as any).code,
        message: (error as any).message,
        name: (error as any).name
      })
      throw error;
    }
  },

  async getDayNotes(): Promise<DayNote[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.DAY_NOTES));
      return querySnapshot.docs.map(doc => doc.data() as DayNote);
    } catch (error) {
      console.error('Error getting day notes:', error);
      throw error;
    }
  },

  async getDayNotesForDate(date: string): Promise<DayNote[]> {
    try {
      const q = query(collection(db, COLLECTIONS.DAY_NOTES), where("date", "==", date));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as DayNote);
    } catch (error) {
      console.error('Error getting day notes for date:', error);
      throw error;
    }
  },

  async deleteDayNote(noteId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DAY_NOTES, noteId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting day note:', error);
      throw error;
    }
  },

  // Real-time listeners with error handling
  subscribeToEmployees(callback: (employees: Employee[]) => void, errorCallback?: (error: any) => void) {
    try {
      return onSnapshot(
        collection(db, COLLECTIONS.EMPLOYEES), 
        (snapshot) => {
          const employees = snapshot.docs.map(doc => doc.data() as Employee);
          callback(employees);
        },
        (error) => {
          console.error('Error in employees subscription:', error);
          if (errorCallback) errorCallback(error);
        }
      );
    } catch (error) {
      console.error('Error setting up employees subscription:', error);
      if (errorCallback) errorCallback(error);
    }
  },

  subscribeToWorkDays(callback: (workDays: WorkDay[]) => void, errorCallback?: (error: any) => void) {
    try {
      return onSnapshot(
        collection(db, COLLECTIONS.WORK_DAYS), 
        (snapshot) => {
          const workDays = snapshot.docs.map(doc => doc.data() as WorkDay);
          callback(workDays);
        },
        (error) => {
          console.error('Error in work days subscription:', error);
          if (errorCallback) errorCallback(error);
        }
      );
    } catch (error) {
      console.error('Error setting up work days subscription:', error);
      if (errorCallback) errorCallback(error);
    }
  },

  subscribeToPayments(callback: (payments: Payment[]) => void, errorCallback?: (error: any) => void) {
    try {
      return onSnapshot(
        collection(db, COLLECTIONS.PAYMENTS), 
        (snapshot) => {
          const payments = snapshot.docs.map(doc => doc.data() as Payment);
          callback(payments);
        },
        (error) => {
          console.error('Error in payments subscription:', error);
          if (errorCallback) errorCallback(error);
        }
      );
    } catch (error) {
      console.error('Error setting up payments subscription:', error);
      if (errorCallback) errorCallback(error);
    }
  },

  subscribeToDayNotes(callback: (dayNotes: DayNote[]) => void, errorCallback?: (error: any) => void) {
    try {
      return onSnapshot(
        collection(db, COLLECTIONS.DAY_NOTES), 
        (snapshot) => {
          const dayNotes = snapshot.docs.map(doc => doc.data() as DayNote);
          callback(dayNotes);
        },
        (error) => {
          console.error('Error in day notes subscription:', error);
          if (errorCallback) errorCallback(error);
        }
      );
    } catch (error) {
      console.error('Error setting up day notes subscription:', error);
      if (errorCallback) errorCallback(error);
    }
  },

  // Network management
  async enableNetwork() {
    try {
      await enableNetwork(db);
      return { success: true };
    } catch (error) {
      console.error('Error enabling network:', error);
      throw error;
    }
  },

  async disableNetwork() {
    try {
      await disableNetwork(db);
      return { success: true };
    } catch (error) {
      console.error('Error disabling network:', error);
      throw error;
    }
  },

  // Authentication functions
  async signUp(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}; 