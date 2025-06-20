import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, where, enableNetwork, disableNetwork } from "firebase/firestore";

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

// Collection names
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  WORK_DAYS: 'workDays'
} as const;

// Firebase service functions with enhanced error handling
export const firebaseService = {
  // Employee functions
  async addEmployee(employee: any) {
    try {
      await setDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), employee);
      return { success: true };
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  },

  async getEmployees() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
      return querySnapshot.docs.map(doc => doc.data());
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
  async addWorkDay(workDay: any) {
    try {
      await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), workDay);
      return { success: true };
    } catch (error) {
      console.error('Error adding work day:', error);
      throw error;
    }
  },

  async getWorkDays() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
      return querySnapshot.docs.map(doc => doc.data());
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

  // Real-time listeners with error handling
  subscribeToEmployees(callback: (employees: any[]) => void, errorCallback?: (error: any) => void) {
    try {
      return onSnapshot(
        collection(db, COLLECTIONS.EMPLOYEES), 
        (snapshot) => {
          const employees = snapshot.docs.map(doc => doc.data());
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

  subscribeToWorkDays(callback: (workDays: any[]) => void, errorCallback?: (error: any) => void) {
    try {
      return onSnapshot(
        collection(db, COLLECTIONS.WORK_DAYS), 
        (snapshot) => {
          const workDays = snapshot.docs.map(doc => doc.data());
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
  }
}; 