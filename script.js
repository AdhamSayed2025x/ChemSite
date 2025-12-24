/* ============ 1. FIREBASE SETUP & IMPORTS ============ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    deleteDoc, doc, updateDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

// إعدادات مشروعك (زي ما بعتها)
const firebaseConfig = {
    apiKey: "AIzaSyBubIM22kgu9jciz-jbWLrdwMyL91Xzg2Q",
    authDomain: "chemsite-d565c.firebaseapp.com",
    projectId: "chemsite-d565c",
    storageBucket: "chemsite-d565c.firebasestorage.app",
    messagingSenderId: "318541575800",
    appId: "1:318541575800:web:ffd603a5be83981e58df8d",
    measurementId: "G-4M6DH42GVG"
};

// تشغيل فايربيز
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ============ 2. GLOBAL VARIABLES & AUTH ============ */
// حالة الأدمن (لسه بنستخدم LocalStorage للدخول السريع)
let isAdmin = localStorage.getItem('isAdmin') === 'true';

// تهيئة الموقع عند الفتح
window.onload = function() {
    updateUI(); // الهيدر والبروفايل
    
    // لو إحنا في صفحة فيها شبكة عرض (زي Books/Labs) نشغل مستمع الداتابيز
    if(document.querySelector('.items-grid')) {
        listenToContent(); 
    }

    // لو في البروفايل نحمل البيانات
    if(window.location.href.includes('profile.html')) {
        loadProfileData();
    }
};

/* ============ 3. REAL-TIME DATABASE LISTENER (السحر) ============ */
function listenToContent() {
    const grid = document.querySelector('.items-grid');
    const emptyMsg = document.getElementById('emptyMsg');
    const pageName = new URLSearchParams(window.location.search).get('page') || 'General';

    // "ودن" بتسمع أي تغيير في الداتابيز لحظياً
    const q = query(collection(db, "content"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        grid.innerHTML = ''; // مسح القديم
        let hasContent = false;

        snapshot.forEach((doc) => {
            const item = doc.data();
            item.id = doc.id; // نحتفظ بمعرف المستند

            // فلترة: هل العنصر تبع الصفحة دي؟
            if (item.page !== pageName) return;

            // صلاحيات: هل مسموح للطالب يشوفه؟
            if (!isAdmin && !item.permissions.visible) return;

            hasContent = true;
            renderOneCard(item, grid);
        });

        // إظهار/إخفاء رسالة الفراغ
        if(emptyMsg) emptyMsg.style.display = hasContent ? 'none' : 'block';
    });
}

// دالة رسم كارت واحد
function renderOneCard(item, grid) {
    const dateStr = new Date(item.timestamp).toLocaleString('en-GB', { hour12: true });
    
    let menuItems = '';
    
    // View
    menuItems += `<div class="menu-item" onclick="window.openViewer('${item.id}', '${item.title}', '${item.type}', '${item.link}')"><i class="fa-solid fa-eye"></i> View</div>`;

    // Download
    if (isAdmin || item.permissions.download) {
        menuItems += `<div class="menu-item" onclick="window.downloadFile('${item.link}')"><i class="fa-solid fa-download"></i> Download</div>`;
    }

    // Share
    if (isAdmin || item.permissions.share) {
        menuItems += `<div class="menu-item" onclick="window.shareFile('${item.title}', '${item.link}')"><i class="fa-solid fa-share-nodes"></i> Share</div>`;
    }

    // Admin Actions
    if (isAdmin) {
        menuItems += `<div class="menu-item" onclick="window.prepareEdit('${item.id}')"><i class="fa-solid fa-pen"></i> Edit</div>`;
        menuItems += `<div class="menu-item delete" onclick="window.deleteContent('${item.id}', '${item.fileRef || ''}')"><i class="fa-solid fa-trash"></i> Delete</div>`;
    }

    const cardHTML = `
        <div class="content-card">
            <div class="card-menu-btn" onclick="window.toggleMenu(this, event)">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </div>
            <div class="card-menu-dropdown">${menuItems}</div>

            <div class="card-icon"><i class="fa-solid ${getIconByType(item.type)}"></i></div>
            <div class="card-meta">${dateStr}</div>
            
            <h3 class="card-title">${item.title}</h3>
            <p class="card-desc">${item.desc}</p>
            
            <div class="card-actions">
                <button class="action-btn btn-view" onclick="window.openViewer('${item.id}', '${item.title}', '${item.type}', '${item.link}')">Open File</button>
            </div>
        </div>
    `;
    grid.insertAdjacentHTML('beforeend', cardHTML);
}

/* ============ 4. ADD / EDIT / UPLOAD LOGIC ============ */
window.openUploadModal = function() {
    document.getElementById('uploadModal').classList.add('active');
    document.getElementById('modalTitle').innerText = "Add New Content";
    document.getElementById('editContentId').value = ""; 
    document.getElementById('contentTitle').value = "";
    document.getElementById('contentDesc').value = "";
    document.getElementById('contentLink').value = "";
    document.getElementById('contentType').value = "pdf";
    window.toggleSourceInput();
    
    // قفل القائمة العائمة
    const fabMenu = document.getElementById('fabMenu');
    if(fabMenu) fabMenu.classList.remove('show');
    const fabBtn = document.querySelector('.fab-main-btn');
    if(fabBtn) fabBtn.classList.remove('active');
}

window.saveContent = async function() {
    const btn = document.querySelector('.publish-btn');
    const originalText = btn.innerText;
    btn.innerText = "Saving..."; // مؤشر تحميل
    btn.disabled = true;

    try {
        const id = document.getElementById('editContentId').value;
        const title = document.getElementById('contentTitle').value;
        const desc = document.getElementById('contentDesc').value;
        const type = document.getElementById('contentType').value;
        let link = document.getElementById('contentLink').value;
        
        // التعامل مع الكاميرا (رفع الصورة)
        const cameraInput = document.getElementById('cameraInput');
        let fileRefPath = null;

        if (type === 'camera' && cameraInput.files[0]) {
            const file = cameraInput.files[0];
            const storageRef = ref(storage, 'uploads/' + new Date().getTime() + '_' + file.name);
            await uploadBytes(storageRef, file);
            link = await getDownloadURL(storageRef);
            fileRefPath = storageRef.fullPath; // نحفظ المسار عشان نقدر نمسحها بعدين
        }

        const permissions = {
            download: document.getElementById('allowDownload').checked,
            share: document.getElementById('allowShare').checked,
            visible: document.getElementById('isVisible').checked
        };

        if (!title) { alert("Title is required!"); btn.innerText = originalText; btn.disabled = false; return; }

        const data = {
            page: new URLSearchParams(window.location.search).get('page') || 'General',
            title, desc, type, link, permissions,
            timestamp: new Date().toISOString()
        };
        if(fileRefPath) data.fileRef = fileRefPath;

        if (id) {
            // Update
            await updateDoc(doc(db, "content", id), data);
        } else {
            // Add New
            await addDoc(collection(db, "content"), data);
        }

        window.closeModal();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving content: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

window.deleteContent = async function(id, fileRefPath) {
    if(confirm("Delete this content permanently?")) {
        try {
            await deleteDoc(doc(db, "content", id));
            // محاولة مسح الملف من الستوريدج لو موجود
            /* (اختياري: ممكن نضيف كود مسح الصورة هنا لاحقاً) */
        } catch (e) {
            console.error(e);
            alert("Error deleting");
        }
    }
}

window.prepareEdit = async function(id) {
    // دي محتاجة جلب البيانات من الكارت (لأننا معندناش DB محلية دلوقتي)
    // للتبسيط: هنعتمد إن البيانات موجودة في الداتابيز ونجيبها
    // بس عشان السرعة: ممكن نعدل الدالة دي لاحقاً لتجيب الداتا من الفايربيز
    // حالياً: التعديل هيحتاج إننا نجيب الداتا الأول.
    alert("Edit feature is upgrading to Cloud... Please delete and re-upload for now until next update! 🛠️");
}

/* ============ 5. UTILS & HELPERS ============ */
window.closeModal = function() {
    document.getElementById('uploadModal').classList.remove('active');
}

window.toggleSourceInput = function() {
    const type = document.getElementById('contentType').value;
    const container = document.getElementById('sourceInputContainer');
    const input = document.getElementById('contentLink');
    const camInput = document.getElementById('cameraInput');

    if (type === 'camera') {
        container.style.display = 'none';
        // تصفير الانبوت عشان نقدر نختار نفس الصورة تاني لو حبينا
        camInput.value = ''; 
    } else {
        container.style.display = 'block';
        input.placeholder = type === 'drive' ? "Paste Google Drive Link..." : "Paste Link here...";
    }
}

// زرار الكاميرا في المودال بيعمل تريجر للانبوت المخفي
// (تأكد إنك ضفت onclick في HTML زي ما عملنا في البروفايل)
// أو هنضيفه هنا برمجياً لما يختار الكاميرا:
document.getElementById('contentType').addEventListener('change', function() {
    if(this.value === 'camera') {
        document.getElementById('cameraInput').click();
    }
});

// التعامل مع التقاط الصورة (فقط عرض اسم الملف)
window.handleCamera = function(input) {
    if (input.files && input.files[0]) {
        alert("Photo selected: " + input.files[0].name + " (Will upload upon Save)");
    }
}

// Viewer
window.openViewer = function(id, title, type, link) {
    const viewer = document.getElementById('fileViewer');
    const frame = document.getElementById('viewerFrame');
    const img = document.getElementById('viewerImage');
    
    document.getElementById('viewerTitle').innerText = title;
    viewer.classList.add('active');

    if (type === 'camera' || link.includes('firebasestorage') || link.startsWith('data:')) {
        frame.style.display = 'none';
        img.style.display = 'block';
        img.src = link;
    } else {
        img.style.display = 'none';
        frame.style.display = 'block';
        let url = link;
        if(url.includes('youtube.com/watch?v=')) url = url.replace('watch?v=', 'embed/');
        if(url.includes('drive.google.com') && url.includes('/view')) url = url.replace('/view', '/preview');
        frame.src = url;
    }
}
window.closeViewer = function() {
    document.getElementById('fileViewer').classList.remove('active');
    document.getElementById('viewerFrame').src = "";
}

// Menu Toggle
window.toggleMenu = function(btn, e) {
    e.stopPropagation();
    document.querySelectorAll('.card-menu-dropdown').forEach(m => m.classList.remove('show'));
    btn.nextElementSibling.classList.toggle('show');
}
window.addEventListener('click', () => {
    document.querySelectorAll('.card-menu-dropdown').forEach(m => m.classList.remove('show'));
});

function getIconByType(type) {
    if(type === 'video') return 'fa-video';
    if(type === 'pdf') return 'fa-file-pdf';
    if(type === 'drive') return 'fa-google-drive';
    if(type === 'camera') return 'fa-camera';
    return 'fa-link';
}

window.downloadFile = function(link) {
    window.open(link, '_blank');
}

window.shareFile = function(title, link) {
    if(navigator.share) {
        navigator.share({ title: title, url: link });
    } else {
        prompt("Copy Link:", link);
    }
}

/* ============ 6. LEGACY UI (Login/Profile) ============ */
window.updateUI = function() {
    const headerActions = document.querySelector('.header-actions');
    const loginBtn = document.querySelector('.login-btn');
    if (isAdmin && headerActions) {
        if (loginBtn) loginBtn.remove();
        let profileImg = document.querySelector('.profile-img-btn');
        const savedImg = localStorage.getItem('profilePic') || "https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg";
        if (!profileImg) {
            const imgHTML = `<img src="${savedImg}" class="profile-img-btn" onclick="window.location.href='profile.html'" title="Admin Profile" style="width:45px; height:45px; border-radius:50%; border:2px solid var(--primary-color); cursor:pointer;">`;
            headerActions.insertAdjacentHTML('beforeend', imgHTML);
        } else {
            profileImg.src = savedImg;
            profileImg.onclick = function() { window.location.href = 'profile.html'; };
        }
    }
}

window.performLogin = function() {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    if ((email === "Adham" || email === "Adham@Vision.Bim") && pass === "123") {
        document.getElementById('successOverlay').classList.add('active');
        localStorage.setItem('isAdmin', 'true');
        setTimeout(() => window.location.href = "index.html", 2000);
    } else {
        document.getElementById('emailError').classList.add('visible');
    }
}
window.logoutUser = function() {
    if(confirm("Logout?")) { localStorage.removeItem('isAdmin'); window.location.href = "index.html"; }
}
// Profile Logic
window.triggerCamera = function() { document.getElementById('fileUpload').click(); }
window.saveProfileImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileImage').src = e.target.result;
            localStorage.setItem('profilePic', e.target.result);
        }
        reader.readAsDataURL(input.files[0]);
    }
}
window.editField = function(id, label) {
    const val = prompt(`New ${label}:`, document.getElementById(id).innerText);
    if(val) { document.getElementById(id).innerText = val; localStorage.setItem(id, val); }
}
window.loadProfileData = function() {
    const img = localStorage.getItem('profilePic'); if(img) document.getElementById('profileImage').src = img;
    const name = localStorage.getItem('profileNameDisplay'); if(name) document.getElementById('profileNameDisplay').innerText = name;
    const about = localStorage.getItem('profileAboutDisplay'); if(about) document.getElementById('profileAboutDisplay').innerText = about;
}
window.togglePassword = function() {
    const p = document.getElementById('passInput'); p.type = p.type === 'password' ? 'text' : 'password';
}
window.clearError = function(id) { document.getElementById(id).classList.remove('visible'); }
window.showComingSoon = function(page) {
    if(page === 'Login Page') window.location.href = 'login.html';
    else window.location.href = isAdmin ? `admin_page.html?page=${page}` : `soon.html?page=${page}`;
}
window.toggleFab = function() {
    document.getElementById('fabMenu').classList.toggle('show');
    document.querySelector('.fab-main-btn').classList.toggle('active');
}