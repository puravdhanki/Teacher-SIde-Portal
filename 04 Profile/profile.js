// Import Firebase SDK and auth functions
import { auth, db, checkAuth } from "./auth.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const profilePicture = document.getElementById("profilePicture");
const uploadProfilePictureBtn = document.getElementById("uploadProfilePictureBtn");
const profilePictureInput = document.getElementById("profilePictureInput");
const profileForm = document.getElementById("profileForm");
const nameInput = document.getElementById("name");
const ageInput = document.getElementById("age");
const dobInput = document.getElementById("dob");
const contactNumberInput = document.getElementById("contactNumber");
const emailInput = document.getElementById("email");
const aadharInput = document.getElementById("aadhar");
const subjectInput = document.getElementById("subjectInput");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const subjectTagContainer = document.getElementById("subjectTagContainer");
const toast = document.getElementById("toast");
const loader = document.getElementById("loader");

// Cloudinary configuration
const cloudName = "edumosaic"; // Replace with your Cloudinary cloud name
const uploadPreset = "Teacher"; // Replace with your upload preset

// Initialize subject list
let subjects = [];

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
    // Check if user is authenticated
    const user = await checkAuth();
    if (!user) return;
    
    // Load user profile
    loadUserProfile(user);
    
    // Set up event listeners
    uploadProfilePictureBtn.addEventListener("click", () => profilePictureInput.click());
    profilePictureInput.addEventListener("change", handleProfilePictureChange);
    profileForm.addEventListener("submit", handleProfileUpdate);
    addSubjectBtn.addEventListener("click", addSubject);
    subjectInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addSubject();
        }
    });
});

// Load user profile
async function loadUserProfile(user) {
    showLoader();
    
    try {
        // Populate email from authentication
        emailInput.value = user.email || "";
        
        // Try to load profile from Firestore
        const docRef = doc(db, "teacher_profiles", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Populate form fields
            nameInput.value = data.name || user.displayName || "";
            ageInput.value = data.age || "";
            dobInput.value = data.dob || "";
            contactNumberInput.value = data.contactNumber || "";
            aadharInput.value = data.aadhar || "";
            
            // Load subjects
            if (data.subjects && Array.isArray(data.subjects)) {
                subjects = data.subjects;
                renderSubjectTags();
            }
            
            // Load profile picture
            if (data.profilePictureUrl) {
                setProfilePicture(data.profilePictureUrl);
            }
        } else {
            // No profile document exists yet, use data from auth
            nameInput.value = user.displayName || "";
            
            // Create initial profile document
            await setDoc(docRef, {
                name: user.displayName || "",
                email: user.email || "",
                createdAt: new Date()
            });
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showToast("Error loading profile data", true);
    }
    
    hideLoader();
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    showLoader();
    
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast("You must be logged in to update your profile", true);
            return;
        }
        
        // Calculate age from DOB if not provided
        let age = ageInput.value;
        if (!age && dobInput.value) {
            const birthDate = new Date(dobInput.value);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            ageInput.value = age;
        }
        
        // Update profile document
        const profileData = {
            name: nameInput.value,
            age: ageInput.value,
            dob: dobInput.value,
            contactNumber: contactNumberInput.value,
            email: emailInput.value,
            aadhar: aadharInput.value,
            subjects: subjects,
            updatedAt: new Date()
        };
        
        await updateDoc(doc(db, "teacher_profiles", user.uid), profileData);
        showToast("Profile updated successfully!");
    } catch (error) {
        console.error("Error updating profile:", error);
        showToast("Error updating profile", true);
    }
    
    hideLoader();
}

// Handle profile picture change
function handleProfilePictureChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoader();
    
    // Create Cloudinary Upload Widget
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            uploadPreset: uploadPreset,
            sources: ["local"],
            multiple: false,
            maxFiles: 1,
            maxFileSize: 5000000, // 5MB
            resourceType: "image"
        },
        async (error, result) => {
            if (error) {
                hideLoader();
                showToast("Image upload failed", true);
                console.error("Cloudinary upload error:", error);
                return;
            }
            
            if (result && result.event === "success") {
                try {
                    const user = auth.currentUser;
                    if (!user) {
                        showToast("You must be logged in to update your profile picture", true);
                        return;
                    }
                    
                    // Get secure URL of the uploaded image
                    const imageUrl = result.info.secure_url;
                    
                    // Update profile document with image URL
                    await updateDoc(doc(db, "teacher_profiles", user.uid), {
                        profilePictureUrl: imageUrl
                    });
                    
                    // Update UI
                    setProfilePicture(imageUrl);
                    showToast("Profile picture updated successfully!");
                } catch (error) {
                    console.error("Error updating profile picture in database:", error);
                    showToast("Error saving profile picture", true);
                }
            }
            hideLoader();
        }
    );
    
    // Open the upload widget
    widget.open();
}

// Add a subject
function addSubject() {
    const subject = subjectInput.value.trim();
    
    if (!subject) return;
    
    if (!subjects.includes(subject)) {
        subjects.push(subject);
        renderSubjectTags();
        subjectInput.value = "";
    } else {
        showToast("Subject already added", true);
    }
}

// Remove a subject
function removeSubject(subject) {
    subjects = subjects.filter(s => s !== subject);
    renderSubjectTags();
}

// Render subject tags
function renderSubjectTags() {
    subjectTagContainer.innerHTML = "";
    
    subjects.forEach(subject => {
        const tagElement = document.createElement("div");
        tagElement.className = "subject-tag";
        tagElement.innerHTML = `
            ${subject}
            <i class="fas fa-times" onclick="window.removeSubject('${subject}')"></i>
        `;
        subjectTagContainer.appendChild(tagElement);
    });
}

// Set profile picture
function setProfilePicture(url) {
    profilePicture.innerHTML = `<img src="${url}" alt="Profile Picture">`;
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

// Expose functions to window for inline event handlers
window.removeSubject = removeSubject;