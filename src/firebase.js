import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Kalau nanti muncul error "API key not valid", ganti isi objek ini
// dengan hasil salin langsung dari Firebase Console (Project settings > Your apps).
const firebaseConfig = {
  apiKey: "AIzaSyDmIOyuIWxsGN-qEcsEiNHS4sf0DgEliG0",
  authDomain: "absensi-maganghub.firebaseapp.com",
  projectId: "absensi-maganghub",
  storageBucket: "absensi-maganghub.firebasestorage.app",
  messagingSenderId: "908551232842",
  appId: "1:908551232842:web:04b0f8ffe32eae20ec35b3",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);