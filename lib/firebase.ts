import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, where } from "firebase/firestore";

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

// Firebase service functions
export const firebaseService = {
  // Employee functions
  async addEmployee(employee: any) {
    await setDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), employee);
  },

  async getEmployees() {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
    return querySnapshot.docs.map(doc => doc.data());
  },

  async deleteEmployee(employeeId: string) {
    await deleteDoc(doc(db, COLLECTIONS.EMPLOYEES, employeeId));
  },

  // Work day functions
  async addWorkDay(workDay: any) {
    await setDoc(doc(db, COLLECTIONS.WORK_DAYS, workDay.id), workDay);
  },

  async getWorkDays() {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.WORK_DAYS));
    return querySnapshot.docs.map(doc => doc.data());
  },

  async deleteWorkDaysForEmployee(employeeId: string) {
    const q = query(collection(db, COLLECTIONS.WORK_DAYS), where("employeeId", "==", employeeId));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  },

  // Real-time listeners
  subscribeToEmployees(callback: (employees: any[]) => void) {
    return onSnapshot(collection(db, COLLECTIONS.EMPLOYEES), (snapshot) => {
      const employees = snapshot.docs.map(doc => doc.data());
      callback(employees);
    });
  },

  subscribeToWorkDays(callback: (workDays: any[]) => void) {
    return onSnapshot(collection(db, COLLECTIONS.WORK_DAYS), (snapshot) => {
      const workDays = snapshot.docs.map(doc => doc.data());
      callback(workDays);
    });
  }
}; 