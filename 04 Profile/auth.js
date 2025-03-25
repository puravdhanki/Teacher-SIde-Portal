// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdmvBSdQfURK9FmURDYG9tWQOtexN5olE",
    authDomain: "p-teacher-385a3.firebaseapp.com",
    projectId: "p-teacher-385a3",
    storageBucket: "p-teacher-385a3.appspot.com",
    messagingSenderId: "265875035839",
    appId: "1:265875035839:web:0f06a92f9b82f45191580a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// DOM Elements for login/signup page
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const toggleLoginPassword = document.getElementById("toggleLoginPassword");
const toggleSignupPassword = document.getElementById("toggleSignupPassword");
const loginPassword = document.getElementById("loginPassword");
const signupPassword = document.getElementById("signupPassword");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const toast = document.getElementById("toast");
const loader = document.getElementById("loader");

// DOM Elements for logout functionality
const logoutBtn = document.getElementById("logoutBtn");

// Check if user is authenticated
export function checkAuth() {
    showLoader();
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            hideLoader();
            if (user) {
                if (window.location.pathname.includes("login.html")) {
                    // Redirect to profile page if user is already logged in
                    window.location.href = "profile.html";
                }
                resolve(user);
            } else {
                if (!window.location.pathname.includes("login.html")) {
                    // Redirect to login page if user is not logged in
                    window.location.href = "login.html";
                }
                resolve(null);
            }
        });
    });
}

// Initialize authentication UI and listeners
export function initAuth() {
    if (loginForm && signupForm) {
        // Login/Signup page initialization
        
        // Tab switching
        loginTab.addEventListener("click", () => {
            loginTab.classList.add("active");
            signupTab.classList.remove("active");
            loginForm.style.display = "block";
            signupForm.style.display = "none";
            document.getElementById("authTitle").textContent = "Login";
        });
        
        signupTab.addEventListener("click", () => {
            signupTab.classList.add("active");
            loginTab.classList.remove("active");
            signupForm.style.display = "block";
            loginForm.style.display = "none";
            document.getElementById("authTitle").textContent = "Sign Up";
        });
        
        // Toggle password visibility
        toggleLoginPassword.addEventListener("click", () => togglePasswordVisibility(loginPassword, toggleLoginPassword));
        toggleSignupPassword.addEventListener("click", () => togglePasswordVisibility(signupPassword, toggleSignupPassword));
        
        // Form submissions
        loginForm.addEventListener("submit", handleLogin);
        signupForm.addEventListener("submit", handleSignup);
        
        // Google sign-in
        googleSignInBtn.addEventListener("click", handleGoogleSignIn);
    }
    
    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
    
    // Check authentication status
    checkAuth();
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    showLoader();
    
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Login successful!");
        window.location.href = "profile.html";
    } catch (error) {
        let errorMessage = "Login failed. Please try again.";
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            errorMessage = "Invalid email or password. Please try again.";
        } else if (error.code === "auth/too-many-requests") {
            errorMessage = "Too many failed login attempts. Please try again later.";
        }
        showToast(errorMessage, true);
        console.error("Login error:", error);
    }
    
    hideLoader();
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    showLoader();
    
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    
    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user profile with display name
        await updateProfile(user, {
            displayName: name
        });
        
        // Create initial profile document
        await setDoc(doc(db, "teacher_profiles", user.uid), {
            name: name,
            email: email,
            createdAt: new Date()
        });
        
        showToast("Account created successfully!");
        window.location.href = "profile.html";
    } catch (error) {
        let errorMessage = "Sign up failed. Please try again.";
        if (error.code === "auth/email-already-in-use") {
            errorMessage = "Email already in use. Please use a different email or login.";
        } else if (error.code === "auth/weak-password") {
            errorMessage = "Password is too weak. Please use at least 6 characters.";
        }
        showToast(errorMessage, true);
        console.error("Signup error:", error);
    }
    
    hideLoader();
}

// Handle Google sign-in
async function handleGoogleSignIn() {
    showLoader();
    
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Check if this is a new user
        const userDoc = await getDoc(doc(db, "teacher_profiles", user.uid));
        
        if (!userDoc.exists()) {
            // Create initial profile for new Google users
            await setDoc(doc(db, "teacher_profiles", user.uid), {
                name: user.displayName || "",
                email: user.email || "",
                createdAt: new Date()
            });
        }
        
        showToast("Signed in with Google successfully!");
        window.location.href = "profile.html";
    } catch (error) {
        showToast("Google sign-in failed. Please try again.", true);
        console.error("Google sign-in error:", error);
    }
    
    hideLoader();
}

// Handle logout
async function handleLogout() {
    showLoader();
    
    try {
        await signOut(auth);
        showToast("Logged out successfully!");
        window.location.href = "login.html";
    } catch (error) {
        showToast("Logout failed. Please try again.", true);
        console.error("Logout error:", error);
    }
    
    hideLoader();
}

// Toggle password visibility
function togglePasswordVisibility(passwordInput, toggleIcon) {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    }
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.backgroundColor = isError ? "#f44336" : "#4CAF50";
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

// Show loader
function showLoader() {
    document.getElementById("loader").style.display = "block";
}

// Hide loader
function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

// Initialize authentication
initAuth();

// Export functions and objects
export { auth, db };