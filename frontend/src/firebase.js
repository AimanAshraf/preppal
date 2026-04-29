import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCDvLPVTtCurkylFV0gOYupD2kMUIDW_Cs",
  authDomain: "preppal04.firebaseapp.com",
  projectId: "preppal04",
  storageBucket: "preppal04.firebasestorage.app",
  messagingSenderId: "830628678729",
  appId: "1:830628678729:web:a108c524a850c967f98398",
  measurementId: "G-WKWYMDBY7V"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const idToken = await result.user.getIdToken()
  return { idToken, user: result.user }
}
