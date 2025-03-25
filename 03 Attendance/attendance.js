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
    getDoc,
    Timestamp
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
const attendanceTableBody = document.getElementById("attendanceTableBody");
const addAttendanceBtn = document.getElementById("addAttendanceBtn");
const attendanceModal = document.getElementById("attendanceModal");
const editAttendanceModal = document.getElementById("editAttendanceModal");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.querySelector(".close");
const editCloseModalBtn = document.querySelector(".edit-close");
const cancelBtn = document.getElementById("cancelBtn");
const editCancelBtn = document.getElementById("editCancelBtn");
const attendanceForm = document.getElementById("attendanceForm");
const editAttendanceForm = document.getElementById("editAttendanceForm");
const studentCheckboxes = document.getElementById("studentCheckboxes");
const markAllPresentBtn = document.getElementById("markAllPresentBtn");
const markAllAbsentBtn = document.getElementById("markAllAbsentBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const attendanceDate = document.getElementById("attendanceDate");
const subjectFilter = document.getElementById("subjectFilter");
const departmentFilter = document.getElementById("departmentFilter");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const modalDate = document.getElementById("modalDate");
const modalSubject = document.getElementById("modalSubject");
const modalDepartment = document.getElementById("modalDepartment");
const toast = document.getElementById("toast");
const loader = document.getElementById("loader");

// Summary elements
const totalStudents = document.getElementById("totalStudents");
const presentCount = document.getElementById("presentCount");
const absentCount = document.getElementById("absentCount");
const attendanceRate = document.getElementById("attendanceRate");

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    attendanceDate.value = today;
    modalDate.value = today;
    
    loadAttendance();
});

addAttendanceBtn.addEventListener("click", openAttendanceModal);
closeModalBtn.addEventListener("click", closeModal);
editCloseModalBtn.addEventListener("click", closeEditModal);
cancelBtn.addEventListener("click", closeModal);
editCancelBtn.addEventListener("click", closeEditModal);
attendanceForm.addEventListener("submit", saveAttendance);
editAttendanceForm.addEventListener("submit", updateAttendance);
markAllPresentBtn.addEventListener("click", markAllPresent);
markAllAbsentBtn.addEventListener("click", markAllAbsent);
searchBtn.addEventListener("click", searchAttendance);
applyFiltersBtn.addEventListener("click", loadAttendance);
modalDepartment.addEventListener("change", loadStudentsByDepartment);

searchInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        searchAttendance();
    }
});

// Functions

// Open modal for taking attendance
async function openAttendanceModal() {
    attendanceForm.reset();
    modalDate.value = new Date().toISOString().split('T')[0];
    modalTitle.textContent = "Take Attendance";
    attendanceModal.style.display = "flex";
    
    // Clear previous student checkboxes
    studentCheckboxes.innerHTML = "";
    
    // Load students for the selected department
    if (modalDepartment.value) {
        await loadStudentsByDepartment();
    }
}

// Load students by department
async function loadStudentsByDepartment() {
    const department = modalDepartment.value;
    
    if (!department) {
        studentCheckboxes.innerHTML = "<p>Please select a department first.</p>";
        return;
    }
    
    showLoader();
    studentCheckboxes.innerHTML = "";
    
    try {
        const q = query(collection(db, "students"), where("dep", "==", department), where("status", "==", "Active"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            studentCheckboxes.innerHTML = "<p>No students found in this department.</p>";
        } else {
            querySnapshot.forEach((doc) => {
                const student = doc.data();
                const studentDiv = document.createElement("div");
                studentDiv.className = "student-checkbox";
                studentDiv.innerHTML = `
                    <input type="checkbox" id="student-${doc.id}" name="students" value="${doc.id}" checked>
                    <label for="student-${doc.id}">
                        <div class="student-info">
                            <span>${student.roll}</span>
                            <span>${student.name}</span>
                        </div>
                        <div class="attendance-status">
                            <select class="status-select" data-student-id="${doc.id}">
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                            </select>
                        </div>
                    </label>
                `;
                studentCheckboxes.appendChild(studentDiv);
            });
        }
    } catch (error) {
        console.error("Error loading students: ", error);
        studentCheckboxes.innerHTML = "<p>Error loading students. Please try again.</p>";
    }
    
    hideLoader();
}

// Mark all students as present
function markAllPresent() {
    const statusSelects = document.querySelectorAll('.status-select');
    statusSelects.forEach(select => {
        select.value = "Present";
    });
}

// Mark all students as absent
function markAllAbsent() {
    const statusSelects = document.querySelectorAll('.status-select');
    statusSelects.forEach(select => {
        select.value = "Absent";
    });
}

// Close the attendance modal
function closeModal() {
    attendanceModal.style.display = "none";
}

// Close the edit attendance modal
function closeEditModal() {
    editAttendanceModal.style.display = "none";
}

// Save attendance records
async function saveAttendance(e) {
    e.preventDefault();
    showLoader();
    
    const date = modalDate.value;
    const subject = modalSubject.value;
    const department = modalDepartment.value;
    
    if (!date || !subject || !department) {
        hideLoader();
        showToast("Please fill in all required fields.");
        return;
    }
    
    const selectedStudents = document.querySelectorAll('input[name="students"]:checked');
    
    if (selectedStudents.length === 0) {
        hideLoader();
        showToast("Please select at least one student.");
        return;
    }
    
    try {
        // First, check if attendance for this date, subject, and department already exists
        const q = query(
            collection(db, "attendance"),
            where("date", "==", date),
            where("subject", "==", subject),
            where("department", "==", department)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            hideLoader();
            if (confirm("Attendance for this date, subject, and department already exists. Do you want to update it?")) {
                // Delete existing records
                for (const doc of querySnapshot.docs) {
                    await deleteDoc(doc.ref);
                }
            } else {
                return;
            }
        }
        
        // Add new attendance records
        for (const studentCheckbox of selectedStudents) {
            const studentId = studentCheckbox.value;
            const status = document.querySelector(`.status-select[data-student-id="${studentId}"]`).value;
            
            // Get student details
            const studentDoc = await getDoc(doc(db, "students", studentId));
            const studentData = studentDoc.data();
            
            await addDoc(collection(db, "attendance"), {
                date: date,
                subject: subject,
                department: department,
                studentId: studentId,
                studentName: studentData.name,
                studentRoll: studentData.roll,
                status: status,
                timestamp: Timestamp.now()
            });
        }
        
        showToast("Attendance saved successfully!");
        closeModal();
        loadAttendance();
    } catch (error) {
        console.error("Error saving attendance: ", error);
        showToast("Error saving attendance data.");
    }
    
    hideLoader();
}

// Load attendance records
async function loadAttendance() {
    showLoader();
    
    try {
        attendanceTableBody.innerHTML = ""; // Clear previous data
        
        const date = attendanceDate.value;
        const subject = subjectFilter.value;
        const department = departmentFilter.value;
        
        let q = collection(db, "attendance");
        
        // Apply filters
        if (date) {
            q = query(q, where("date", "==", date));
        }
        
        if (subject) {
            q = query(q, where("subject", "==", subject));
        }
        
        if (department) {
            q = query(q, where("department", "==", department));
        }
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            attendanceTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">No attendance records found</td>
                </tr>
            `;
            
            // Reset summary
            updateSummary(0, 0, 0);
        } else {
            let presentStudents = 0;
            let absentStudents = 0;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                if (data.status === "Present") {
                    presentStudents++;
                } else {
                    absentStudents++;
                }
                
                appendAttendanceRow(doc.id, data);
            });
            
            // Update summary
            updateSummary(presentStudents + absentStudents, presentStudents, absentStudents);
        }
    } catch (error) {
        console.error("Error loading attendance: ", error);
        showToast("Error loading attendance data.");
    }
    
    hideLoader();
}

// Update attendance summary
function updateSummary(total, present, absent) {
    totalStudents.textContent = total;
    presentCount.textContent = present;
    absentCount.textContent = absent;
    
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    attendanceRate.textContent = `${rate}%`;
}

// Search attendance
async function searchAttendance() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        loadAttendance();
        return;
    }
    
    showLoader();
    
    try {
        attendanceTableBody.innerHTML = ""; // Clear previous data
        
        const querySnapshot = await getDocs(collection(db, "attendance"));
        let hasResults = false;
        let presentStudents = 0;
        let absentStudents = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            if (
                data.studentName.toLowerCase().includes(searchTerm) ||
                data.studentRoll.toLowerCase().includes(searchTerm)
            ) {
                appendAttendanceRow(doc.id, data);
                hasResults = true;
                
                if (data.status === "Present") {
                    presentStudents++;
                } else {
                    absentStudents++;
                }
            }
        });
        
        if (!hasResults) {
            attendanceTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">No matching attendance records found</td>
                </tr>
            `;
            
            // Reset summary
            updateSummary(0, 0, 0);
        } else {
            // Update summary
            updateSummary(presentStudents + absentStudents, presentStudents, absentStudents);
        }
    } catch (error) {
        console.error("Error searching attendance: ", error);
        showToast("Error searching attendance records.");
    }
    
    hideLoader();
}

// Append an attendance row to the table
function appendAttendanceRow(id, data) {
    const row = document.createElement("tr");
    
    const statusClass = data.status === "Present" ? "status-present" : "status-absent";
    const toggleBtnClass = data.status === "Present" ? "mark-absent" : "mark-present";
    const toggleBtnText = data.status === "Present" ? "Mark Absent" : "Mark Present";
    
    row.innerHTML = `
        <td>${data.studentRoll}</td>
        <td>${data.studentName}</td>
        <td>${data.department}</td>
        <td>${data.subject}</td>
        <td><span class="${statusClass}">${data.status}</span></td>
        <td class="action-links">
            <button class="toggle-status ${toggleBtnClass}" title="${toggleBtnText}" onclick="window.toggleAttendanceStatus('${id}', '${data.status}')">
                ${toggleBtnText}
            </button>
            <button class="edit-btn" title="Edit" onclick="window.editAttendance('${id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" title="Delete" onclick="window.deleteAttendance('${id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    attendanceTableBody.appendChild(row);
}

// Show loader
function showLoader() {
    loader.style.display = "block";
}

// Hide loader
function hideLoader() {
    loader.style.display = "none";
}

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.className = "toast show";
    
    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000);
}

// Toggle attendance status
async function toggleAttendanceStatus(id, currentStatus) {
    const newStatus = currentStatus === "Present" ? "Absent" : "Present";
    
    showLoader();
    
    try {
        const attendanceRef = doc(db, "attendance", id);
        await updateDoc(attendanceRef, {
            status: newStatus
        });
        
        showToast(`Student marked as ${newStatus}`);
        loadAttendance();
    } catch (error) {
        console.error("Error updating attendance status: ", error);
        showToast("Error updating attendance status.");
    }
    
    hideLoader();
}

// Open modal for editing attendance
async function editAttendance(id) {
    showLoader();
    
    try {
        const docRef = doc(db, "attendance", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById("editAttendanceId").value = id;
            document.getElementById("editName").value = data.studentName;
            document.getElementById("editRoll").value = data.studentRoll;
            document.getElementById("editDep").value = data.department;
            document.getElementById("editSubject").value = data.subject;
            document.getElementById("editStatus").value = data.status;
            
            editAttendanceModal.style.display = "flex";
        } else {
            showToast("Attendance record not found.");
        }
    } catch (error) {
        console.error("Error getting attendance record: ", error);
        showToast("Error retrieving attendance record data.");
    }
    
    hideLoader();
}

// Update attendance record
async function updateAttendance(e) {
    e.preventDefault();
    showLoader();
    
    const id = document.getElementById("editAttendanceId").value;
    const subject = document.getElementById("editSubject").value;
    const status = document.getElementById("editStatus").value;
    
    try {
        const attendanceRef = doc(db, "attendance", id);
        await updateDoc(attendanceRef, {
            subject: subject,
            status: status
        });
        
        showToast("Attendance record updated successfully!");
        closeEditModal();
        loadAttendance();
    } catch (error) {
        console.error("Error updating attendance record: ", error);
        showToast("Error updating attendance record.");
    }
    
    hideLoader();
}

// Delete attendance record
async function deleteAttendance(id) {
    if (confirm("Are you sure you want to delete this attendance record?")) {
        showLoader();
        
        try {
            await deleteDoc(doc(db, "attendance", id));
            showToast("Attendance record deleted successfully!");
            loadAttendance();
        } catch (error) {
            console.error("Error deleting attendance record: ", error);
            showToast("Error deleting attendance record.");
        }
        
        hideLoader();
    }
}

// Export functions that need to be accessed from HTML
window.toggleAttendanceStatus = toggleAttendanceStatus;
window.editAttendance = editAttendance;
window.deleteAttendance = deleteAttendance;

// Function to generate attendance report
async function generateAttendanceReport() {
    showLoader();
    
    try {
        const date = attendanceDate.value;
        const subject = subjectFilter.value;
        const department = departmentFilter.value;
        
        if (!date || !subject || !department) {
            showToast("Please select date, subject, and department to generate report.");
            hideLoader();
            return;
        }
        
        const q = query(
            collection(db, "attendance"),
            where("date", "==", date),
            where("subject", "==", subject),
            where("department", "==", department)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showToast("No attendance records found for the selected filters.");
            hideLoader();
            return;
        }
        
        // Here you can implement the report generation logic
        // For example, you can create a CSV file or a printable view
        
        // For now, we'll just show a notification
        showToast("Attendance report generated successfully!");
    } catch (error) {
        console.error("Error generating attendance report: ", error);
        showToast("Error generating attendance report.");
    }
    
    hideLoader();
}

// Function to get student attendance statistics
async function getStudentAttendanceStats(studentId) {
    try {
        const q = query(collection(db, "attendance"), where("studentId", "==", studentId));
        const querySnapshot = await getDocs(q);
        
        let totalClasses = 0;
        let presentClasses = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalClasses++;
            
            if (data.status === "Present") {
                presentClasses++;
            }
        });
        
        const attendanceRate = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
        
        return {
            totalClasses,
            presentClasses,
            absentClasses: totalClasses - presentClasses,
            attendanceRate: attendanceRate.toFixed(1)
        };
    } catch (error) {
        console.error("Error getting student attendance stats: ", error);
        return null;
    }
}

// Function to get subject attendance statistics
async function getSubjectAttendanceStats(subject, department) {
    try {
        const q = query(
            collection(db, "attendance"),
            where("subject", "==", subject),
            where("department", "==", department)
        );
        
        const querySnapshot = await getDocs(q);
        
        let totalRecords = 0;
        let presentCount = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalRecords++;
            
            if (data.status === "Present") {
                presentCount++;
            }
        });
        
        const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
        
        return {
            totalRecords,
            presentCount,
            absentCount: totalRecords - presentCount,
            attendanceRate: attendanceRate.toFixed(1)
        };
    } catch (error) {
        console.error("Error getting subject attendance stats: ", error);
        return null;
    }
}

// Function to navigate to student records page with specific student
function viewStudentRecord(studentId) {
    window.location.href = `test.html?studentId=${studentId}`;
}

// Function to check if a student exists in the database
async function checkStudentExists(roll, department) {
    try {
        const q = query(
            collection(db, "students"),
            where("roll", "==", roll),
            where("dep", "==", department)
        );
        
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking student existence: ", error);
        return false;
    }
}

// Function to get attendance by date range
async function getAttendanceByDateRange(startDate, endDate, department, subject) {
    try {
        const q = query(collection(db, "attendance"));
        const querySnapshot = await getDocs(q);
        
        const results = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recordDate = data.date;
            
            if (recordDate >= startDate && recordDate <= endDate) {
                if (department && data.department !== department) {
                    return;
                }
                
                if (subject && data.subject !== subject) {
                    return;
                }
                
                results.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        return results;
    } catch (error) {
        console.error("Error getting attendance by date range: ", error);
        return [];
    }
}

// Function to sync attendance data with student records
async function syncAttendanceWithStudentRecords() {
    showLoader();
    
    try {
        // Get all students
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const students = {};
        
        studentsSnapshot.forEach((doc) => {
            const data = doc.data();
            students[doc.id] = data;
        });
        
        // Get all attendance records
        const attendanceSnapshot = await getDocs(collection(db, "attendance"));
        const updates = [];
        
        attendanceSnapshot.forEach((doc) => {
            const data = doc.data();
            const studentId = data.studentId;
            
            // Check if the student still exists and if the data matches
            if (students[studentId]) {
                const student = students[studentId];
                
                if (data.studentName !== student.name || data.studentRoll !== student.roll) {
                    updates.push({
                        id: doc.id,
                        data: {
                            studentName: student.name,
                            studentRoll: student.roll
                        }
                    });
                }
            }
        });
        
        // Perform updates
        for (const update of updates) {
            await updateDoc(doc(db, "attendance", update.id), update.data);
        }
        
        showToast(`Synchronized ${updates.length} attendance records with student data.`);
    } catch (error) {
        console.error("Error syncing attendance with student records: ", error);
        showToast("Error syncing attendance with student records.");
    }
    
    hideLoader();
}

// Function to export attendance data to CSV
function exportAttendanceToCSV() {
    showLoader();
    
    try {
        const date = attendanceDate.value;
        const subject = subjectFilter.value;
        const department = departmentFilter.value;
        
        if (!date || !subject || !department) {
            showToast("Please select date, subject, and department to export data.");
            hideLoader();
            return;
        }
        
        const headers = ["Roll Number", "Name", "Department", "Subject", "Status", "Date"];
        let csvContent = headers.join(",") + "\n";
        
        const rows = attendanceTableBody.querySelectorAll("tr");
        
        rows.forEach(row => {
            const columns = row.querySelectorAll("td");
            if (columns.length >= 5) {
                const roll = columns[0].textContent;
                const name = columns[1].textContent;
                const dept = columns[2].textContent;
                const subj = columns[3].textContent;
                const status = columns[4].textContent;
                
                const rowData = [roll, name, dept, subj, status, date];
                csvContent += rowData.join(",") + "\n";
            }
        });
        
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance_${department}_${subject}_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showToast("Attendance data exported successfully!");
    } catch (error) {
        console.error("Error exporting attendance data: ", error);
        showToast("Error exporting attendance data.");
    }
    
    hideLoader();
}

// Initialize the page
window.onload = function() {
    loadAttendance();
    
    // Add event listeners for any additional buttons
    const exportButton = document.getElementById("exportButton");
    if (exportButton) {
        exportButton.addEventListener("click", exportAttendanceToCSV);
    }
    
    const syncButton = document.getElementById("syncButton");
    if (syncButton) {
        syncButton.addEventListener("click", syncAttendanceWithStudentRecords);
    }
    
    // Check if we have a student ID in the URL (coming from student records page)
    const urlParams = new URLSearchParams(window.location.search);
    const studentIdFromUrl = urlParams.get("studentId");
    
    if (studentIdFromUrl) {
        // We could filter attendance for this student
        searchInput.value = studentIdFromUrl;
        searchAttendance();
    }
};

// let q = collection(db, "attendance");
// let conditions = [];
// if (date) conditions.push(where("date", "==", date));
// if (subject) conditions.push(where("subject", "==", subject));
// if (department) conditions.push(where("department", "==", department));
// if (conditions.length > 0) q = query(q, ...conditions);
