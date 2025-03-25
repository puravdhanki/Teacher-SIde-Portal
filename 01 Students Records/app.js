// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdmvBSdQfURK9FmURDYG9tWQOtexN5olE",
    authDomain: "p-teacher-385a3.firebaseapp.com",
    projectId: "p-teacher-385a3",
    storageBucket: "p-teacher-385a3.firebasestorage.app",
    messagingSenderId: "265875035839",
    appId: "1:265875035839:web:0f06a92f9b82f45191580a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const studentTableBody = document.getElementById("studentTableBody");
const addStudentBtn = document.getElementById("addStudentBtn");
const studentModal = document.getElementById("studentModal");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.querySelector(".close");
const cancelBtn = document.getElementById("cancelBtn");
const studentForm = document.getElementById("studentForm");
const studentIdInput = document.getElementById("studentId");
const nameInput = document.getElementById("name");
const rollInput = document.getElementById("roll");
const depInput = document.getElementById("dep");
const statusInput = document.getElementById("status");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const toast = document.getElementById("toast");
const loader = document.getElementById("loader");

// Event Listeners
document.addEventListener("DOMContentLoaded", loadStudents);
addStudentBtn.addEventListener("click", openAddStudentModal);
closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
studentForm.addEventListener("submit", saveStudent);
searchBtn.addEventListener("click", searchStudents);
searchInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        searchStudents();
    }
});

// Functions

// Open modal for adding a new student
function openAddStudentModal() {
    studentForm.reset();
    studentIdInput.value = "";
    modalTitle.textContent = "Add New Student";
    studentModal.style.display = "flex";
}

// Open modal for editing a student
async function openEditStudentModal(id) {
    showLoader();
    try {
        const docRef = doc(db, "students", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            studentIdInput.value = id;
            nameInput.value = data.name;
            rollInput.value = data.roll;
            depInput.value = data.dep;
            statusInput.value = data.status;
            
            modalTitle.textContent = "Edit Student";
            studentModal.style.display = "flex";
        } else {
            showToast("Student not found!");
        }
    } catch (error) {
        console.error("Error getting student: ", error);
        showToast("Error retrieving student data.");
    }
    hideLoader();
}

// Close the modal
function closeModal() {
    studentModal.style.display = "none";
}

// Save student (add or update)
async function saveStudent(e) {
    e.preventDefault();
    showLoader();
    
    const studentData = {
        name: nameInput.value,
        roll: rollInput.value,
        dep: depInput.value,
        status: statusInput.value
    };
    
    try {
        if (studentIdInput.value) {
            // Update existing student
            const studentRef = doc(db, "students", studentIdInput.value);
            await updateDoc(studentRef, studentData);
            showToast("Student updated successfully!");
        } else {
            // Add new student
            await addDoc(collection(db, "students"), studentData);
            showToast("Student added successfully!");
        }
        
        closeModal();
        loadStudents();
    } catch (error) {
        console.error("Error saving student: ", error);
        showToast("Error saving student data.");
    }
    hideLoader();
}

// Delete a student
async function deleteStudent(id) {
    if (confirm("Are you sure you want to delete this student?")) {
        showLoader();
        try {
            await deleteDoc(doc(db, "students", id));
            showToast("Student deleted successfully!");
            loadStudents();
        } catch (error) {
            console.error("Error deleting student: ", error);
            showToast("Error deleting student.");
        }
        hideLoader();
    }
}

// Load all students
async function loadStudents() {
    showLoader();
    try {
        studentTableBody.innerHTML = ""; // Clear previous data
        
        const querySnapshot = await getDocs(collection(db, "students"));
        if (querySnapshot.empty) {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">No students found</td>
                </tr>
            `;
        } else {
            querySnapshot.forEach((doc) => {
                appendStudentRow(doc.id, doc.data());
            });
        }
    } catch (error) {
        console.error("Error loading students: ", error);
        showToast("Error loading student data.");
    }
    hideLoader();
}

// Search students
async function searchStudents() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        loadStudents();
        return;
    }
    
    showLoader();
    try {
        studentTableBody.innerHTML = ""; // Clear previous data
        
        const querySnapshot = await getDocs(collection(db, "students"));
        let hasResults = false;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (
                data.name.toLowerCase().includes(searchTerm) ||
                data.roll.toLowerCase().includes(searchTerm) ||
                data.dep.toLowerCase().includes(searchTerm)
            ) {
                appendStudentRow(doc.id, data);
                hasResults = true;
            }
        });
        
        if (!hasResults) {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">No matching students found</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error("Error searching students: ", error);
        showToast("Error searching for students.");
    }
    hideLoader();
}

// Append a student row to the table
function appendStudentRow(id, data) {
    const row = document.createElement("tr");
    
    const statusClass = data.status === "Active" ? "status-active" : "status-inactive";
    
    row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.roll}</td>
        <td>${data.dep}</td>
        <td><span class="${statusClass}">${data.status}</span></td>
        <td class="action-links">
            <button class="edit-btn" title="Edit" onclick="window.editStudent('${id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" title="Delete" onclick="window.deleteStudent('${id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    studentTableBody.appendChild(row);
}

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

// Show loader
function showLoader() {
    loader.style.display = "block";
}

// Hide loader
function hideLoader() {
    loader.style.display = "none";
}

// Expose functions to window for inline event handlers
window.editStudent = openEditStudentModal;
window.deleteStudent = deleteStudent;