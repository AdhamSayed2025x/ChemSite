/* ============ 1. INITIALIZATION & AUTH ============ */
// تعريف الأدمن وتحميل البيانات الأساسية
let isAdmin = localStorage.getItem('isAdmin') === 'true';

// قاعدة البيانات (تخزين محلي مبدئياً لحد ما الفايربيز يحمل)
let contentDB = JSON.parse(localStorage.getItem('chemSiteDB')) || [];

window.onload = function() {
    updateUI();         // تحديث الهيدر والبروفايل
    renderCards();      // رسم المحتوى (الكروت)
    
    // لو احنا في صفحة البروفايل، حمل بياناتها
    if(window.location.href.includes('profile.html')) {
        loadProfileData();
    }
};

/* ============ 2. UI & HEADER LOGIC ============ */
// تحديث الهيدر (إظهار البروفايل أو زرار الدخول)
function updateUI() {
    const headerActions = document.querySelector('.header-actions');
    const loginBtn = document.querySelector('.login-btn');

    // شرط أساسي: لازم نكون أدمن والصفحة فيها هيدر
    if (isAdmin && headerActions) {
        if (loginBtn) loginBtn.remove(); // شيل زرار الدخول

        let profileImg = document.querySelector('.profile-img-btn');
        const savedImg = localStorage.getItem('profilePic') || "https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg";

        if (!profileImg) {
            // إضافة الصورة لو مش موجودة
            const imgHTML = `
                <img src="${savedImg}" 
                     class="profile-img-btn" 
                     onclick="window.location.href='profile.html'"
                     title="Admin Profile"
                     style="width:45px; height:45px; border-radius:50%; border:2px solid var(--primary-color); cursor:pointer;">
            `;
            headerActions.insertAdjacentHTML('beforeend', imgHTML);
        } else {
            // تحديث الصورة لو موجودة
            profileImg.src = savedImg;
            profileImg.onclick = function() { window.location.href = 'profile.html'; };
            profileImg.style.cursor = "pointer";
        }
    }
}

/* ============ 3. CONTENT SYSTEM (RENDER & CARDS) ============ */
// دالة رسم الكروت (الوحش الجديد)
function renderCards() {
    const grid = document.querySelector('.items-grid');
    const emptyMsg = document.getElementById('emptyMsg');
    
    if (!grid) return; // لو مفيش شبكة (زي صفحة اللوجين) اخرج

    grid.innerHTML = ''; // مسح القديم
    const pageName = new URLSearchParams(window.location.search).get('page') || 'General';

    // فلترة المحتوى حسب الصفحة
    const pageContent = contentDB.filter(item => item.page === pageName);

    if (pageContent.length === 0) {
        if(emptyMsg) emptyMsg.style.display = 'block';
    } else {
        if(emptyMsg) emptyMsg.style.display = 'none';
        
        pageContent.forEach(item => {
            // لو طالب والملف مخفي -> مترسموش
            if (!isAdmin && !item.permissions.visible) return;

            // تنسيق التاريخ
            const dateStr = new Date(item.timestamp).toLocaleString('en-GB', { hour12: true });
            
            // تجهيز القائمة (Dropdown)
            let menuItems = '';
            
            // زرار المشاهدة (للجميع)
            menuItems += `<div class="menu-item" onclick="openViewer('${item.id}')"><i class="fa-solid fa-eye"></i> View</div>`;

            // زرار التحميل (لو مسموح أو أدمن)
            if (isAdmin || item.permissions.download) {
                menuItems += `<div class="menu-item" onclick="downloadFile('${item.link}')"><i class="fa-solid fa-download"></i> Download</div>`;
            }

            // زرار المشاركة (لو مسموح أو أدمن)
            if (isAdmin || item.permissions.share) {
                menuItems += `<div class="menu-item" onclick="shareFile('${item.title}', '${item.link}')"><i class="fa-solid fa-share-nodes"></i> Share</div>`;
            }

            // أزرار الأدمن (تعديل وحذف)
            if (isAdmin) {
                menuItems += `<div class="menu-item" onclick="editContent('${item.id}')"><i class="fa-solid fa-pen"></i> Edit</div>`;
                menuItems += `<div class="menu-item delete" onclick="deleteContent('${item.id}')"><i class="fa-solid fa-trash"></i> Delete</div>`;
            }

            // رسم الكارت
            const cardHTML = `
                <div class="content-card">
                    <div class="card-menu-btn" onclick="toggleMenu(this, event)">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </div>
                    <div class="card-menu-dropdown">${menuItems}</div>

                    <div class="card-icon"><i class="fa-solid ${getIconByType(item.type)}"></i></div>
                    <div class="card-meta">${dateStr}</div>
                    
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-desc">${item.desc}</p>
                    
                    <div class="card-actions">
                        <button class="action-btn btn-view" onclick="openViewer('${item.id}')">Open File</button>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('afterbegin', cardHTML);
        });
    }
}

/* ============ 4. ADMIN ACTIONS (ADD / EDIT / DELETE) ============ */
// فتح المودال للإضافة
function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
    document.getElementById('modalTitle').innerText = "Add New Content";
    document.getElementById('editContentId').value = ""; // فضي المعرف
    
    // تصفير الخانات
    document.getElementById('contentTitle').value = "";
    document.getElementById('contentDesc').value = "";
    document.getElementById('contentLink').value = "";
    document.getElementById('contentType').value = "pdf";
    toggleSourceInput();
    
    // غلق القائمة العائمة
    const fabMenu = document.getElementById('fabMenu');
    if(fabMenu) { fabMenu.classList.remove('show'); document.querySelector('.fab-main-btn').classList.remove('active'); }
}

// فتح المودال للتعديل
function editContent(id) {
    const item = contentDB.find(c => c.id == id);
    if (!item) return;

    document.getElementById('uploadModal').classList.add('active');
    document.getElementById('modalTitle').innerText = "Edit Content";
    document.getElementById('editContentId').value = item.id;
    
    document.getElementById('contentTitle').value = item.title;
    document.getElementById('contentDesc').value = item.desc;
    document.getElementById('contentType').value = item.type;
    document.getElementById('contentLink').value = item.link;
    
    // ضبط الصلاحيات
    document.getElementById('allowDownload').checked = item.permissions.download;
    document.getElementById('allowShare').checked = item.permissions.share;
    document.getElementById('isVisible').checked = item.permissions.visible;
    
    toggleSourceInput();
}

// حفظ المحتوى (تم استبداله بالنسخة الأونلاين في آخر الملف)

// حذف المحتوى (تم استبداله بالنسخة الأونلاين في آخر الملف)


// غلق المودال
function closeModal() {
    document.getElementById('uploadModal').classList.remove('active');
}

/* ============ 5. UTILS & VIEWER & CAMERA ============ */
// تغيير حقل الادخال حسب النوع
function toggleSourceInput() {
    const type = document.getElementById('contentType').value;
    const container = document.getElementById('sourceInputContainer');
    const input = document.getElementById('contentLink');
    const camInput = document.getElementById('cameraInput');

    // التأكد من وجود العناصر قبل التعامل معها لتجنب الأخطاء
    if (!container || !input) return;

    if (type === 'camera') {
        container.style.display = 'none';
        if(camInput) camInput.click();
    } else if (type === 'drive') {
        container.style.display = 'block';
        input.placeholder = "Paste Google Drive Link...";
    } else {
        container.style.display = 'block';
        input.placeholder = "Paste Link here...";
    }
}

// التعامل مع الكاميرا
function handleCamera(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('contentLink').value = e.target.result;
            document.getElementById('sourceInputContainer').style.display = 'none';
            alert("Photo captured! 📸");
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// فتح المشاهد (Viewer)
function openViewer(id) {
    const item = contentDB.find(c => c.id == id);
    if (!item) return;

    const viewer = document.getElementById('fileViewer');
    const frame = document.getElementById('viewerFrame');
    const img = document.getElementById('viewerImage');
    const title = document.getElementById('viewerTitle');

    title.innerText = item.title;
    viewer.classList.add('active');

    // لو صورة
    if (item.type === 'camera' || item.link.startsWith('data:image')) {
        frame.style.display = 'none';
        img.style.display = 'block';
        img.src = item.link;
    } else {
        // لو ملف/فيديو
        img.style.display = 'none';
        frame.style.display = 'block';
        let url = item.link;
        if(url.includes('youtube.com/watch?v=')) url = url.replace('watch?v=', 'embed/');
        if(url.includes('drive.google.com') && url.includes('/view')) url = url.replace('/view', '/preview');
        frame.src = url;
    }
}

function closeViewer() {
    document.getElementById('fileViewer').classList.remove('active');
    document.getElementById('viewerFrame').src = "";
}

// القوائم المنسدلة
function toggleMenu(btn, e) {
    e.stopPropagation();
    document.querySelectorAll('.card-menu-dropdown').forEach(m => m.classList.remove('show'));
    btn.nextElementSibling.classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.card-menu-dropdown').forEach(m => m.classList.remove('show'));
});

// الأيقونات
function getIconByType(type) {
    if(type === 'video') return 'fa-video';
    if(type === 'pdf') return 'fa-file-pdf';
    if(type === 'drive') return 'fa-google-drive';
    if(type === 'camera') return 'fa-camera';
    return 'fa-link';
}

// دالة التحميل الوهمية
function downloadFile(link) {
    if(link.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = link;
        a.download = "downloaded_file.jpg";
        a.click();
    } else {
        window.open(link, '_blank');
    }
}

// دالة المشاركة الوهمية
function shareFile(title, link) {
    if(navigator.share) {
        navigator.share({ title: title, url: link });
    } else {
        prompt("Copy this link:", link);
    }
}

/* ============ 6. LOGIN & NAVIGATION & PROFILE ============ */
function showComingSoon(featureName) {
    if (featureName === 'Login Page') {
        window.location.href = 'login.html';
        return;
    }
    if (isAdmin) {
        window.location.href = `admin_page.html?page=${featureName}`;
    } else {
        window.location.href = `soon.html?page=${featureName}`;
    }
}

// 🔥🔥🔥🔥🔥 دالة تسجيل الدخول (النسخة الجديدة المتصلة بفايربيز) 🔥🔥🔥🔥🔥
function performLogin() {
    // 1. بنجيب البيانات من الخانات
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passInput').value.trim();

    // لو الخانات فاضية نطلع تنبيه
    if (!email || !pass) {
        alert("Please enter email and password");
        return;
    }

    // بنغير شكل الزرار عشان يبان إنه بيحمل
    const loginBtn = document.querySelector('.submit-login-btn');
    const originalText = loginBtn.innerText;
    loginBtn.innerText = "Checking...";
    loginBtn.style.opacity = "0.7";
    loginBtn.disabled = true; // نوقف الزرار عشان ميدوسش مرتين

    // 2. أمر الفايربيز للدخول (ده السطر اللي بيشبك مع السيرفر)
    auth.signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            // ✅ الدخول نجح (البيانات صح)
            console.log("Logged in:", userCredential.user.email);

            document.getElementById('successOverlay').classList.add('active');
            
            // بنحفظ في المتصفح إنك بقيت أدمن
            localStorage.setItem('isAdmin', 'true');
            
            // بنحفظ الإيميل عشان نعرضه في البروفايل
            localStorage.setItem('profileEmailDisplay', userCredential.user.email);

            // توجيه للصفحة الرئيسية بعد ثانيتين
            setTimeout(() => window.location.href = "index.html", 2000);
        })
        .catch((error) => {
            // ❌ الدخول فشل (البيانات غلط أو النت فاصل)
            console.error("Error:", error.code, error.message);
            
            // إظهار رسالة الخطأ الحمراء
            const errorMsg = document.getElementById('emailError');
            errorMsg.innerText = "Wrong Email or Password"; 
            errorMsg.classList.add('visible');
            
            // نرجع الزرار زي ما كان
            loginBtn.innerText = originalText;
            loginBtn.style.opacity = "1";
            loginBtn.disabled = false;
        });
}

function logoutUser() {
    if(confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('isAdmin');
        window.location.href = "index.html";
    }
}

function toggleFab() {
    document.getElementById('fabMenu').classList.toggle('show');
    document.querySelector('.fab-main-btn').classList.toggle('active');
}

// Profile Page Logic
function triggerCamera() { document.getElementById('fileUpload').click(); }
function saveProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileImage').src = e.target.result;
            localStorage.setItem('profilePic', e.target.result);
        }
        reader.readAsDataURL(input.files[0]);
    }
}
function editField(id, label) {
    const el = document.getElementById(id);
    const val = prompt(`Enter new ${label}:`, el.innerText);
    if(val) { el.innerText = val; localStorage.setItem(id, val); }
}
function loadProfileData() {
    const img = localStorage.getItem('profilePic');
    if(img) document.getElementById('profileImage').src = img;
    const name = localStorage.getItem('profileNameDisplay');
    if(name) document.getElementById('profileNameDisplay').innerText = name;
    const about = localStorage.getItem('profileAboutDisplay');
    if(about) document.getElementById('profileAboutDisplay').innerText = about;
}

// Login Helper
function togglePassword() {
    const pass = document.getElementById('passInput');
    pass.type = pass.type === 'password' ? 'text' : 'password';
}
function clearError(id) { document.getElementById(id).classList.remove('visible'); }

/* ============ 5. أدوات عامة (بحث وفوتر) ============ */
function toggleSearch() {
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('searchInput');
    if(searchContainer) {
        searchContainer.classList.toggle('active');
        if (searchContainer.classList.contains('active')) searchInput.focus();
    }
}

function togglePopup(popupId) {
    document.querySelectorAll('.contact-popup').forEach(p => p.classList.remove('show'));
    const popup = document.getElementById(popupId);
    if(popup) popup.classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.closest('.contact-item')) {
        document.querySelectorAll('.contact-popup').forEach(p => p.classList.remove('show'));
    }
}


// 1. هات العنصر بتاع القائمة
const moreMenu = document.getElementById('adminMoreMenu');

// 2. لو العنصر موجود
if (moreMenu) {
    // لو أدمن خليه يظهر (block)، لو طالب خليه يختفي (none)
    moreMenu.style.display = isAdmin ? 'block' : 'none';
}


/* ============ SEARCH LOGIC ============ */
window.handleSearch = function() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const resultsBox = document.getElementById('searchResults');
    
    // 1. لو الخانة فاضية، اخفي الصندوق واخرج
    if (query.length === 0) {
        resultsBox.style.display = 'none';
        return;
    }

    // 2. تصفية البيانات (Search Filter)
    // بندور في العناوين (title) اللي موجودة في الداتابيز
    const matches = contentDB.filter(item => item.title.toLowerCase().includes(query));

    // 3. عرض النتائج
    resultsBox.innerHTML = ''; // مسح القديم
    resultsBox.style.display = 'block';

    if (matches.length > 0) {
        // لو لقينا نتايج
        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            // لما يدوس على النتيجة يفتح الملف
            div.onclick = () => {
                // نستخدم دالة openViewer اللي عملناها قبل كدا
                openViewer(item.link, item.type, item.title);
                resultsBox.style.display = 'none'; // نخفي القائمة بعد الاختيار
            };
            
            // شكل النتيجة (أيقونة + العنوان)
            div.innerHTML = `
                <i class="fa-solid ${getIconByType(item.type)}"></i>
                <span>${item.title}</span>
            `;
            resultsBox.appendChild(div);
        });
    } else {
        // 4. لو مفيش نتايج (الرسالة المطلوبة)
        resultsBox.innerHTML = `
            <div class="no-result-msg">
                -Ve . The search results is not belong to this site.
            </div>
        `;
    }
};



/* ============ PROFILE BUTTONS FUNCTIONS ============ */

// 1. تشغيل الوضع الليلي
window.toggleTheme = function() {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('themeIcon');
    
    // تغيير الأيقونة من هلال لشمس والعكس
    if(document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
};

// 2. تغيير اللغة (محاكاة)
window.toggleLanguage = function() {
    const langTxt = document.getElementById('langText');
    if (langTxt.innerText === 'English') {
        langTxt.innerText = 'العربية';
        alert("تم تغيير اللغة إلى العربية");
    } else {
        langTxt.innerText = 'English';
        alert("Language switched to English");
    }
};

// 3. طلب تغيير الباسورد
window.changePasswordRequest = function() {
    // هنا بنعمل محاكاة، وممكن نربطها بفايربيز قدام بـ sendPasswordResetEmail
    const confirmChange = confirm("Do you want to reset your password?");
    if(confirmChange) {
        alert("Password reset link has been sent to your email! 📧");
    }
};

// 4. تحديث الإيميل الحقيقي للأدمن (لو مسجل دخول)
// الدالة دي بتشتغل أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', () => {
    // استنى ثانية عشان الفايربيز يحمل
    setTimeout(() => {
        if(auth.currentUser && document.getElementById('profileEmailDisplay')) {
            document.getElementById('profileEmailDisplay').innerText = auth.currentUser.email;
        }
    }, 1500);
});


/* ============ TOGGLE UPLOAD VS LINK ============ */
window.toggleSourceInput = function() {
    const type = document.getElementById('contentType').value;
    
    const fileContainer = document.getElementById('fileInputContainer'); // زرار الرفع
    const linkContainer = document.getElementById('linkInputContainer'); // خانة اللينك
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');

    // تصفير (إخفاء الكل مبدئياً)
    fileContainer.style.display = 'none';
    linkContainer.style.display = 'none';

    if (type === 'drive') {
        // لو اخترت لينك خارجي
        linkContainer.style.display = 'block';
    } 
    else if (type === 'camera') {
        // لو اخترت كاميرا
        cameraInput.click(); // يفتح الكاميرا علطول
    } 
    else {
        // لو اخترت (PDF, Image, Video) -> أظهر زرار الرفع
        fileContainer.style.display = 'block';
    }
};

/* ============ YEAR PAGE TITLE CHANGER ============ */
document.addEventListener('DOMContentLoaded', () => {
    // 1. بنشوف هل إحنا في صفحة السنوات ولا لا
    if (window.location.pathname.includes('year_page.html')) {
        
        // 2. بنجيب "الإشارة" من الرابط (السنة كام؟)
        const urlParams = new URLSearchParams(window.location.search);
        const year = urlParams.get('year'); // هيجيب مثلاً "First” أو "Second”

        if (year) {
            // 3. بنغير العنوان اللي في الهيدر
            // بندور على المكان اللي مكتوب فيه ChemSite ونزود جنبه السنة
            const logoText = document.querySelector('.logo-area span');
            if (logoText) {
                logoText.innerText = `ChemSite | ${year} Year`;
            }

            // 4. بنغير العنوان الكبير اللي في نص الصفحة كمان (اختياري)
            const mainTitle = document.getElementById('pageTitle');
            if (mainTitle) {
                mainTitle.innerText = `${year} Year Chemistry`;
            }
            
            // 5. بنغير عنوان المتصفح فوق (التبويب)
            document.title = `${year} Year | ChemSite`;
        }
    }
});


/* =======================================================
   🔥🔥 FIREBASE INTEGRATION (START) 🔥🔥
   Paste this at the VERY END of your script.js
   ======================================================= */

// 1. إعدادات Firebase الخاصة بيك (من الكود اللي أنت بعته)
const firebaseConfig = {
    apiKey: "AIzaSyDzclgF6XX7CIwCv0ETq8SoCYNzy9_MbTI",
    authDomain: "chemistry-site-db.firebaseapp.com",
    databaseURL: "https://chemistry-site-db-default-rtdb.firebaseio.com",
    projectId: "chemistry-site-db",
    storageBucket: "chemistry-site-db.firebasestorage.app",
    messagingSenderId: "321108080858",
    appId: "1:321108080858:web:85cfa02b2a34eb2cb64de3",
    measurementId: "G-NJBSCV6NZG"
};

// 2. تهيئة التطبيق (بنتأكد إن Firebase مش شغال بالفعل)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 3. تعريف المتغيرات للتعامل مع الداتابيز
const db = firebase.database();
const auth = firebase.auth(); // ✅ تم التفعيل

console.log("🔥 Firebase Connected Successfully!");

/* ============ 4. استبدال دوال الحفظ والعرض لتشتغل أونلاين ============ */

// دالة جديدة لجلب البيانات من النت وعرضها
function fetchRealData() {
    const dbRef = db.ref('content'); // مكان تخزين المحتوى
    
    // الأمر ده بيشتغل لوحده كل ما يحصل تغيير في الداتابيز
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        contentDB = []; // تصفير القائمة المحلية عشان نملاها من النت
        
        if (data) {
            // تحويل البيانات من صيغة Object لصيغة Array
            Object.keys(data).forEach(key => {
                contentDB.push({
                    id: key, // مفتاح الفايربيز هو الـ ID الجديد
                    ...data[key]
                });
            });
        }
        
        // تحديث العرض بالكروت الجديدة
        if (typeof renderCards === 'function') {
            renderCards();
        }
        console.log("Data updated from Firebase ✅");
    });
}

// تعديل دالة الحفظ لترسل للنت بدل الجهاز
// (Override saveContent function)
window.saveContent = function() {
    // تجميع البيانات من الفورم
    const id = document.getElementById('editContentId').value;
    const title = document.getElementById('contentTitle').value;
    const desc = document.getElementById('contentDesc').value;
    const type = document.getElementById('contentType').value;
    const link = document.getElementById('contentLink').value;
    
    // إعداد شكل البيانات اللي هتترفع
    const itemData = {
        title: title, 
        desc: desc, 
        type: type, 
        link: link,
        page: new URLSearchParams(window.location.search).get('page') || 'General',
        timestamp: new Date().toISOString(),
        isImportant: document.getElementById('isImportant').checked,
        permissions: {
            download: document.getElementById('allowDownload').checked,
            share: document.getElementById('allowShare').checked,
            visible: document.getElementById('isVisible').checked
        }
    };

    if (!title) return alert("Title is required!");

    // زرار الحفظ
    const publishBtn = document.querySelector('.publish-btn');
    if(publishBtn) publishBtn.innerText = "Saving...";

    if (id) {
        // --- حالة التعديل (Update) ---
        // بنشوف هل الـ ID ده موجود في الداتابيز ولا ده كان لوكال قديم
        // لو ID جاي من فايربيز بيكون طويل وفيه حروف، لو قديم بيكون أرقام بس
        
        // هنا هنفترض إنه موجود ونحدثه
        db.ref('content/' + id).update(itemData)
            .then(() => {
                alert("Updated Successfully! ✅");
                closeModal();
            })
            .catch((err) => alert("Error: " + err.message))
            .finally(() => { if(publishBtn) publishBtn.innerText = "Save / Publish"; });

    } else {
        // --- حالة الإضافة الجديدة (Create) ---
        // push بتعمل ID فريد أوتوماتيك ومستحيل يتكرر
        db.ref('content').push(itemData)
            .then(() => {
                alert("Uploaded Successfully! 🚀");
                closeModal();
            })
            .catch((err) => alert("Error: " + err.message))
            .finally(() => { if(publishBtn) publishBtn.innerText = "Save / Publish"; });
    }
};

// تعديل دالة الحذف (Override Delete)
window.deleteContent = function(id) {
    if(confirm("Delete this content permanently from Database?")) {
        db.ref('content/' + id).remove()
            .then(() => console.log("Deleted from Firebase"))
            .catch(err => alert("Error deleting: " + err.message));
    }
};

// تشغيل جلب البيانات أول ما الموقع يفتح
document.addEventListener('DOMContentLoaded', () => {
    fetchRealData();
});

/* =======================================================
   🔥🔥 FIREBASE INTEGRATION (END) 🔥🔥
   ======================================================= */
