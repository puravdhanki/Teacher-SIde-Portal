// Import Firebase SDK (Firestore only)
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
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCdmvBSdQfURK9FmURDYG9tWQOtexN5olE",
    authDomain: "p-teacher-385a3.firebaseapp.com",
    projectId: "p-teacher-385a3",
    storageBucket: "p-teacher-385a3.appspot.com",
    messagingSenderId: "265875035839",
    appId: "1:265875035839:web:0f06a92f9b82f45191580a"
};

// Cloudinary configuration
const cloudinaryConfig = {
    cloudName: "edumosaic", // Replace with your Cloudinary cloud name
    uploadPreset: "Teacher" // Create an unsigned upload preset in your Cloudinary dashboard
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const announcementsContainer = document.getElementById("announcementsContainer");
const createAnnouncementBtn = document.getElementById("createAnnouncementBtn");
const announcementModal = document.getElementById("announcementModal");
const viewAnnouncementModal = document.getElementById("viewAnnouncementModal");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.querySelector(".close");
const closeViewModalBtn = document.getElementById("closeViewModal");
const cancelBtn = document.getElementById("cancelBtn");
const announcementForm = document.getElementById("announcementForm");
const announcementIdInput = document.getElementById("announcementId");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const fileUploadInput = document.getElementById("fileUpload");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const uploadProgressContainer = document.getElementById("uploadProgress");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const toast = document.getElementById("toast");
const loader = document.getElementById("loader");

// Confirmation dialog elements
const confirmDialog = document.getElementById("confirmDialog");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
let announcementToDelete = null;

// Functions

// Format date to readable format
function formatDate(timestamp) {
    if (!timestamp) return "Unknown date";
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
    }
}

// Get file icon based on file type
function getFileIcon(fileName) {
    if (!fileName) return 'fa-file';
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
        case 'pdf':
            return 'fa-file-pdf';
        case 'doc':
        case 'docx':
            return 'fa-file-word';
        case 'xls':
        case 'xlsx':
            return 'fa-file-excel';
        case 'ppt':
        case 'pptx':
            return 'fa-file-powerpoint';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            return 'fa-file-image';
        case 'zip':
        case 'rar':
            return 'fa-file-archive';
        case 'txt':
            return 'fa-file-alt';
        default:
            return 'fa-file';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// Open modal for creating a new announcement
function openCreateAnnouncementModal() {
    announcementForm.reset();
    announcementIdInput.value = "";
    fileNameDisplay.textContent = "No file selected";
    uploadProgressContainer.style.display = "none";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
    
    modalTitle.textContent = "Create New Announcement";
    announcementModal.style.display = "flex";
}

// Close the announcement modal
function closeModal() {
    announcementModal.style.display = "none";
}

// Close the view announcement modal
function closeViewModal() {
    viewAnnouncementModal.style.display = "none";
}

// Update file selection display
function updateFileSelection() {
    if (fileUploadInput.files.length > 0) {
        const file = fileUploadInput.files[0];
        fileNameDisplay.textContent = file.name;
    } else {
        fileNameDisplay.textContent = "No file selected";
    }
}

// Upload file to Cloudinary
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        
        // Create a folder path based on the current date to organize uploads
        const folderPath = `announcements/${new Date().toISOString().slice(0, 10)}`;
        formData.append('folder', folderPath);
        
        // Show progress container
        uploadProgressContainer.style.display = "block";
        
        // Use the Cloudinary upload API
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`;
        
        // Create ajax request to track progress
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;
            }
        };
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
            } else {
                reject(new Error('Upload failed with status: ' + xhr.status));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Network error during upload'));
        };
        
        xhr.send(formData);
    });
}

// Save announcement with optional file upload
async function saveAnnouncement(e) {
    e.preventDefault();
    showLoader();
    
    try {
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const file = fileUploadInput.files[0];
        
        if (!title || !description) {
            showToast("Please fill in all required fields");
            hideLoader();
            return;
        }
        
        const announcementData = {
            title,
            description,
            createdAt: serverTimestamp(),
            fileAttachment: null
        };
        
        // If a file is selected, upload it to Cloudinary
        if (file) {
            try {
                // Upload to Cloudinary
                const uploadResult = await uploadToCloudinary(file);
                console.log("Cloudinary upload result:", uploadResult);
                
                // Add file metadata to the announcement data
                announcementData.fileAttachment = {
                    name: file.name,
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    size: file.size,
                    type: file.type,
                    format: uploadResult.format,
                    resourceType: uploadResult.resource_type
                };
                
                console.log("File uploaded successfully:", uploadResult.secure_url);
                
            } catch (uploadError) {
                console.error("File upload failed:", uploadError);
                showToast("File upload failed: " + uploadError.message);
                hideLoader();
                return;
            }
        }
        
        // Add the announcement to Firestore
        const docRef = await addDoc(collection(db, "announcements"), announcementData);
        console.log("Announcement added with ID:", docRef.id);
        
        showToast("Announcement published successfully!");
        closeModal();
        await loadAnnouncements(); // Wait for announcements to reload
        
    } catch (error) {
        console.error("Error saving announcement:", error);
        showToast("Error publishing announcement: " + error.message);
    }
    
    hideLoader();
}

// Show confirmation dialog for deletion
function showDeleteConfirmation(id, event) {
    // Stop event propagation
    if (event) {
        event.stopPropagation();
    }
    
    // Store the announcement ID to delete
    announcementToDelete = id;
    
    // Show the confirmation dialog
    confirmDialog.style.display = "flex";
}

// Confirm deletion and proceed
async function confirmDelete() {
    if (!announcementToDelete) return;
    
    showLoader();
    try {
        // Get announcement data first (to access file info if needed)
        const docRef = doc(db, "announcements", announcementToDelete);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // If there's an attachment with publicId, try to delete from Cloudinary
            // Note: This would typically be handled server-side in a production app
            if (data.fileAttachment && data.fileAttachment.publicId) {
                console.log("File would be deleted from Cloudinary in production:", data.fileAttachment.publicId);
            }
            
            // Delete the document from Firestore
            await deleteDoc(docRef);
            console.log("Announcement deleted successfully");
            
            showToast("Announcement deleted successfully!");
            await loadAnnouncements(); // Reload announcements
            
            // Close view modal if it's open
            closeViewModal();
        } else {
            showToast("Announcement not found!");
        }
    } catch (error) {
        console.error("Error deleting announcement:", error);
        showToast("Error deleting announcement: " + error.message);
    }
    
    // Hide the confirmation dialog and reset
    confirmDialog.style.display = "none";
    announcementToDelete = null;
    hideLoader();
}

// Cancel deletion
function cancelDelete() {
    confirmDialog.style.display = "none";
    announcementToDelete = null;
}

// Load all announcements
async function loadAnnouncements() {
    showLoader();
    try {
        announcementsContainer.innerHTML = ""; // Clear previous announcements
        
        console.log("Loading announcements...");
        
        // Get announcements ordered by creation time (newest first)
        const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        console.log(`Found ${querySnapshot.size} announcements`);
        
        if (querySnapshot.empty) {
            showNoAnnouncementsMessage();
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                appendAnnouncementCard(doc.id, data);
            });
        }
    } catch (error) {
        console.error("Error loading announcements:", error);
        showToast("Error loading announcements: " + error.message);
        
        // Show a more specific error message to help troubleshoot
        announcementsContainer.innerHTML = `
            <div class="no-announcements">
                <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
                <h3>Error Loading Announcements</h3>
                <p>There was a problem connecting to the database. Error: ${error.message}</p>
                <button class="btn" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
    hideLoader();
}

// Show a message when no announcements are available
function showNoAnnouncementsMessage() {
    announcementsContainer.innerHTML = `
        <div class="no-announcements">
            <i class="fas fa-bullhorn"></i>
            <h3>No Announcements Yet</h3>
            <p>Be the first to create an announcement for your students.</p>
            <button class="btn" id="noAnnouncementsCreateBtn">
                <i class="fas fa-plus"></i> Create Announcement
            </button>
        </div>
    `;
    
    // Add event listener to the button
    const createBtn = document.getElementById("noAnnouncementsCreateBtn");
    if (createBtn) {
        createBtn.addEventListener("click", openCreateAnnouncementModal);
    }
}

// Append an announcement card to the container
function appendAnnouncementCard(id, data) {
    try {
        const card = document.createElement("div");
        card.classList.add("announcement-card");
        card.setAttribute("data-id", id);
        
        // Safety check for data properties
        if (!data) {
            console.error("Invalid announcement data for ID:", id);
            return;
        }
        
        // Default values in case the data is missing
        const title = data.title || "Untitled Announcement";
        const description = data.description || "No description provided";
        
        // Prepare a preview of the description (truncated)
        const descriptionPreview = description.length > 150 
            ? description.substring(0, 150) + "..." 
            : description;
        
        // Format the date
        const formattedDate = formatDate(data.createdAt);
        
        // Check if there's an attachment
        const hasAttachment = data.fileAttachment !== null && data.fileAttachment !== undefined;
        const attachmentHtml = hasAttachment ? `
            <div class="announcement-attachment-preview">
                <i class="fas ${getFileIcon(data.fileAttachment.name)} announcement-attachment-icon"></i>
                <span>${data.fileAttachment.name}</span>
            </div>
        ` : '';
        
        card.innerHTML = `
            <div class="announcement-header">
                <h3 class="announcement-title">${title}</h3>
                <div class="announcement-date">${formattedDate}</div>
            </div>
            <div class="announcement-preview">${descriptionPreview}</div>
            ${attachmentHtml}
            <div class="announcement-actions">
                <button class="delete-announcement-btn" title="Delete Announcement">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Add click event to open the announcement
        card.addEventListener("click", (e) => {
            // Don't open if clicking the delete button
            if (!e.target.closest('.delete-announcement-btn')) {
                openViewAnnouncementModal(id);
            }
        });
        
        // Add event listener for delete button
        const deleteBtn = card.querySelector(".delete-announcement-btn");
        deleteBtn.addEventListener("click", (event) => showDeleteConfirmation(id, event));
        
        announcementsContainer.appendChild(card);
    } catch (error) {
        console.error("Error creating announcement card:", error);
    }
}

// Open modal for viewing an announcement
async function openViewAnnouncementModal(id) {
    showLoader();
    try {
        const docRef = doc(db, "announcements", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Set title and date
            document.getElementById("viewAnnouncementTitle").textContent = data.title || "Untitled";
            document.getElementById("viewAnnouncementDate").textContent = formatDate(data.createdAt);
            
            // Set description (preserve line breaks)
            document.getElementById("viewAnnouncementDescription").textContent = data.description || "";
            
            // Store announcement ID for delete functionality
            viewAnnouncementModal.setAttribute("data-id", id);
            
            // Update delete button with announcement ID
            const deleteBtn = document.getElementById("deleteAnnouncementBtn");
            if (deleteBtn) {
                deleteBtn.onclick = (event) => showDeleteConfirmation(id, event);
            }
            
            // Handle attachment display
            const attachmentContainer = document.getElementById("viewAnnouncementAttachment");
            
            if (data.fileAttachment) {
                const file = data.fileAttachment;
                const fileIcon = getFileIcon(file.name);
                const fileSize = formatFileSize(file.size);
                const fileUrl = file.url;
                const fileName = file.name;
                
                // Get file type (with a fallback if the type is missing)
                const fileType = (file.type || "").toLowerCase();
                const resourceType = file.resourceType || "";
                
                // HTML for attachment info and download button
                let attachmentHtml = `
                    <h4>Attachment:</h4>
                    <div class="attachment-container">
                        <i class="fas ${fileIcon} attachment-icon"></i>
                        <div class="attachment-details">
                            <div class="attachment-name">${fileName}</div>
                            <div class="attachment-meta">${fileSize}</div>
                        </div>
                        <a href="${fileUrl}" target="_blank" class="download-btn">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                `;
                
                // For images, add an optimized Cloudinary image preview
                if (resourceType === 'image' || fileType.includes('image/')) {
                    // Use Cloudinary transformations for responsive images
                    const transformedUrl = fileUrl.replace('/upload/', '/upload/c_scale,w_800/');
                    attachmentHtml += `
                        <div class="image-preview-container">
                            <img src="${transformedUrl}" alt="${fileName}" class="image-preview">
                        </div>
                    `;
                }
                // For PDFs, add a PDF preview if supported by the browser
                else if (fileType === 'application/pdf' || file.format === 'pdf') {
                    attachmentHtml += `<iframe src="${fileUrl}" class="pdf-preview"></iframe>`;
                }
                // For videos, add a video player
                else if (resourceType === 'video' || fileType.includes('video/')) {
                    attachmentHtml += `
                        <video controls class="video-preview">
                            <source src="${fileUrl}" type="${fileType}">
                            Your browser does not support the video tag.
                        </video>
                    `;
                }
                
                attachmentContainer.innerHTML = attachmentHtml;
                
            } else {
                attachmentContainer.innerHTML = `<p class="no-attachment-message">No attachment for this announcement.</p>`;
            }
            
            viewAnnouncementModal.style.display = "flex";
        } else {
            showToast("Announcement not found!");
        }
    } catch (error) {
        console.error("Error getting announcement:", error);
        showToast("Error retrieving announcement data: " + error.message);
    }
    hideLoader();
}

// Search announcements
async function searchAnnouncements() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        loadAnnouncements();
        return;
    }
    
    showLoader();
    try {
        announcementsContainer.innerHTML = ""; // Clear previous data
        
        // Get all announcements
        const querySnapshot = await getDocs(collection(db, "announcements"));
        let hasResults = false;
        
        // Filter announcements that match the search term
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const title = (data.title || "").toLowerCase();
            const description = (data.description || "").toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                appendAnnouncementCard(doc.id, data);
                hasResults = true;
            }
        });
        
        // Display a message if no results found
        if (!hasResults) {
            announcementsContainer.innerHTML = `
                <div class="no-announcements">
                    <i class="fas fa-search"></i>
                    <h3>No matching announcements found</h3>
                    <p>Try a different search term or create a new announcement.</p>
                    <button class="btn" id="clearSearchBtn">
                        <i class="fas fa-redo"></i> Show All Announcements
                    </button>
                </div>
            `;
            
            // Add event listener to the clear search button
            const clearSearchBtn = document.getElementById("clearSearchBtn");
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener("click", () => {
                    searchInput.value = '';
                    loadAnnouncements();
                });
            }
        }
    } catch (error) {
        console.error("Error searching announcements:", error);
        showToast("Error searching for announcements: " + error.message);
    }
    hideLoader();
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

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    loadAnnouncements();
    
    // UI Event Listeners
    createAnnouncementBtn.addEventListener("click", openCreateAnnouncementModal);
    closeModalBtn.addEventListener("click", closeModal);
    closeViewModalBtn.addEventListener("click", closeViewModal);
    cancelBtn.addEventListener("click", closeModal);
    announcementForm.addEventListener("submit", saveAnnouncement);
    chooseFileBtn.addEventListener("click", () => fileUploadInput.click());
    fileUploadInput.addEventListener("change", updateFileSelection);
    searchBtn.addEventListener("click", searchAnnouncements);
    searchInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            searchAnnouncements();
        }
    });
    
    // Confirmation dialog listeners
    confirmDeleteBtn.addEventListener("click", confirmDelete);
    cancelDeleteBtn.addEventListener("click", cancelDelete);
    
    console.log("Application initialized with Cloudinary for file storage");
    console.log("Cloudinary cloud name:", cloudinaryConfig.cloudName);
});