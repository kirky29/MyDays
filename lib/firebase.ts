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
  PAYMENTS: 'payments'
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
import type { Employee, WorkDay, Payment } from './store'

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