const firebaseConfig = {
  apiKey: "AIzaSyDSzQp2smPjDtxiEvf-ogZngjYKxpee-2U",
  authDomain: "article-camp-c0ed6.firebaseapp.com",
  projectId: "article-camp-c0ed6",
  storageBucket: "article-camp-c0ed6.firebasestorage.app",
  messagingSenderId: "1037321564701",
  appId: "1:1037321564701:web:9a91e1361c384745f3ccf4",
  measurementId: "G-EQEF9Y1HNF",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const analytics = firebase.analytics();

const subcategoriesMap = {
  Academic: [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Electronics",
    "English",
  ],
  Experience: ["Internship", "Research", "Campus Life", "Club Activities"],
  Projects: [
    "Full-Stack MERN",
    "Machine Learning",
    "Embedded Systems",
    "Mobile Apps",
  ],
  Jobs: ["Full-Time", "Remote", "Freelance", "On-Campus"],
  Blog: ["Tech Insights", "Career Advice", "Personal Stories", "Tutorials"],
};

// Global Modal Reader Utility
async function openArticleModal(articleId) {
  const modal = document.getElementById("article-modal");
  const body = document.getElementById("modal-article-body");
  if (!modal || !body) return;

  body.innerHTML =
    '<div class="spinner-wrapper"><div class="spinner"></div><span>Opening story...</span></div>';
  modal.classList.remove("hidden");

  try {
    const docRef = db.collection("articles").doc(articleId);
    const doc = await docRef.get();

    if (!doc.exists) {
      body.innerHTML = '<p class="text-red-500">Story not found.</p>';
      return;
    }

    const article = doc.data();
    docRef
      .update({ views: firebase.firestore.FieldValue.increment(1) })
      .catch(() => {});

    const dateStr = article.createdAt
      ? article.createdAt.toDate().toLocaleDateString()
      : "Recently";
    const avatarHtml = article.authorAvatar
      ? `<img src="${article.authorAvatar}" class="author-avatar inline-block mr-1">`
      : "";

    body.innerHTML = `
          <div class="mb-4">
              <span class="badge role-${article.role.toLowerCase()}">${article.role}</span>
              <span class="badge category">${article.category} / ${article.subcategory}</span>
              <span class="date ml-2">${dateStr}</span>
          </div>
          <h1 class="font-display text-3xl font-semibold mb-2">${article.title}</h1>
          <div class="flex items-center gap-2 mb-6 text-sm text-gray-600">
              ${avatarHtml}
              <span>By <strong>${article.author}</strong></span>
          </div>
          <hr class="border-[var(--border-color)] mb-6">
          <div class="prose max-w-none text-base leading-relaxed">${article.content}</div>
      `;
  } catch (err) {
    console.error("Error loading article modal:", err);
    body.innerHTML = '<p class="text-red-500">Error opening story.</p>';
  }
}

function openLightbox(imgSrc) {
  const lb = document.getElementById("image-lightbox");
  const img = document.getElementById("lightbox-img");
  if (lb && img) {
    img.src = imgSrc;
    lb.classList.remove("hidden");
  }
}

document.addEventListener("click", (e) => {
  if (e.target.tagName === "IMG" && e.target.closest(".card-content")) {
    e.stopPropagation();
    openLightbox(e.target.src);
    return;
  }
  if (
    e.target.id === "close-modal" ||
    e.target.classList.contains("modal-overlay")
  ) {
    document.getElementById("article-modal")?.classList.add("hidden");
  }
  if (
    e.target.id === "close-lightbox" ||
    e.target.classList.contains("lightbox-overlay")
  ) {
    document.getElementById("image-lightbox")?.classList.add("hidden");
  }
});

// ==========================================
// 1. WELCOME PAGE LOGIC (index.html)
// ==========================================
const landingStoriesContainer = document.getElementById(
  "landing-stories-container",
);
if (landingStoriesContainer) {
  async function loadLandingStories() {
    try {
      const snapshot = await db
        .collection("articles")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();
      landingStoriesContainer.innerHTML = "";

      if (snapshot.empty) {
        landingStoriesContainer.innerHTML =
          '<p class="text-center text-gray-500 py-4">No stories posted yet.</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const article = doc.data();
        const id = doc.id;
        const dateStr = article.createdAt
          ? article.createdAt.toDate().toLocaleDateString()
          : "Recently";
        const avatarHtml = article.authorAvatar
          ? `<img src="${article.authorAvatar}" class="author-avatar inline-block mr-1">`
          : "";
        const views = article.views || 0;

        landingStoriesContainer.innerHTML += `
                  <div class="minimal-card" onclick="openArticleModal('${id}')">
                      <div class="card-meta">
                          <span class="badge role-${article.role.toLowerCase()}">${article.role}</span>
                          <span class="badge category">${article.category}</span>
                          <span class="date">${dateStr}</span>
                          <span class="views-count">• 🔥 ${views} views</span>
                      </div>
                      <h2 class="font-display font-semibold">${article.title}</h2>
                      <div class="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          ${avatarHtml}
                          <span>By ${article.author}</span>
                      </div>
                  </div>
              `;
      });
    } catch (err) {
      console.error("Landing load error:", err);
      landingStoriesContainer.innerHTML =
        '<p class="text-center text-red-500 py-4">Failed to load stories.</p>';
    }
  }

  loadLandingStories();
  // Auto-refresh interval completely removed
}

// ==========================================
// 2. MAIN FEED PAGE LOGIC (feed.html)
// ==========================================
const articlesList = document.getElementById('articles-list');
if (articlesList) {
    let currentCategory = "All";
    let currentSubcategory = "All";
    let lastVisibleDoc = null;
    let isLoading = false;
    let hasMoreArticles = true;
    const PAGE_SIZE = 5;

    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat');
    if (catParam) currentCategory = catParam;

    async function loadMoreArticles(reset = false) {
        if (isLoading || (!hasMoreArticles && !reset)) return;
        isLoading = true;

        const scrollTrigger = document.getElementById('infinite-scroll-trigger');
        if (scrollTrigger) scrollTrigger.classList.remove('hidden');

        if (reset) {
            articlesList.innerHTML = '';
            lastVisibleDoc = null;
            hasMoreArticles = true;
        }

        try {
            // Fetch ordered documents from Firestore
            let q = db.collection("articles").orderBy("createdAt", "desc");
            
            if (lastVisibleDoc) {
                q = q.startAfter(lastVisibleDoc);
            }
            q = q.limit(PAGE_SIZE * 2); // Fetch a slightly larger batch for in-memory filtering

            const snapshot = await q.get();

            if (snapshot.empty) {
                hasMoreArticles = false;
                if (reset) {
                    articlesList.innerHTML = '<p class="text-center text-gray-500 py-8">No stories found under this topic.</p>';
                }
                if (scrollTrigger) scrollTrigger.classList.add('hidden');
                isLoading = false;
                return;
            }

            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

            // Filter in memory to prevent missing index crashes
            let docsToRender = snapshot.docs.filter(doc => {
                const data = doc.data();
                const catMatch = (currentCategory === "All") || (data.category === currentCategory);
                const subMatch = (currentSubcategory === "All") || (data.subcategory === currentSubcategory);
                return catMatch && subMatch;
            });

            if (docsToRender.length === 0 && reset) {
                articlesList.innerHTML = '<p class="text-center text-gray-500 py-8">No stories found under this topic.</p>';
            }

            docsToRender.forEach(doc => {
                const article = doc.data();
                const id = doc.id;
                const dateStr = article.createdAt ? article.createdAt.toDate().toLocaleDateString() : 'Recently';
                const avatarHtml = article.authorAvatar ? `<img src="${article.authorAvatar}" class="author-avatar">` : '';

                const cardHTML = `
                    <article class="card" onclick="openArticleModal('${id}')">
                        <div class="card-meta">
                            <span class="badge role-${article.role ? article.role.toLowerCase() : 'student'}">${article.role || 'Member'}</span>
                            <span class="badge category">${article.category} / ${article.subcategory}</span>
                            <span class="date">${dateStr}</span>
                        </div>
                        <h2 class="font-display font-semibold">${article.title}</h2>
                        <div class="flex items-center gap-2 mb-2 text-xs text-gray-600">
                            ${avatarHtml}
                            <span>By <strong>${article.author}</strong></span>
                        </div>
                        <div class="card-content">${article.content}</div>
                    </article>
                `;
                articlesList.insertAdjacentHTML('beforeend', cardHTML);
            });

            if (snapshot.docs.length < PAGE_SIZE * 2) {
                hasMoreArticles = false;
                if (scrollTrigger) scrollTrigger.classList.add('hidden');
            }

        } catch (err) {
            console.error("Infinite scroll error:", err);
            if (reset) articlesList.innerHTML = '<p class="text-center text-red-500 py-6">Failed to load stories. Creating Firebase index...</p>';
        } finally {
            isLoading = false;
        }
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreArticles && !isLoading) {
            loadMoreArticles();
        }
    }, { threshold: 0.1 });

    const scrollTrigger = document.getElementById('infinite-scroll-trigger');
    if (scrollTrigger) observer.observe(scrollTrigger);

    function updateSubcategoryUI(cat) {
        const subContainer = document.getElementById('subcategory-filter');
        subContainer.innerHTML = '<button class="sub-filter-btn active" data-sub="All">All Topics</button>';

        if (cat !== "All" && subcategoriesMap[cat]) {
            subcategoriesMap[cat].forEach(sub => {
                const btn = document.createElement('button');
                btn.className = 'sub-filter-btn';
                btn.dataset.sub = sub;
                btn.textContent = sub;
                subContainer.appendChild(btn);
            });
        }

        document.querySelectorAll('.sub-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentSubcategory = e.target.dataset.sub;
                loadMoreArticles(true);
            });
        });
    }

    document.querySelectorAll('#main-category-filter .filter-btn').forEach(btn => {
        if (btn.dataset.filter === currentCategory) {
            document.querySelectorAll('#main-category-filter .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#main-category-filter .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.filter;
            currentSubcategory = "All";
            updateSubcategoryUI(currentCategory);
            loadMoreArticles(true);
        });
    });

    updateSubcategoryUI(currentCategory);
    loadMoreArticles(true);
}

// ==========================================
// 3. EDITOR LOGIC (write.html)
// ==========================================
const editorContainer = document.getElementById("editor-container");
let quill;
if (editorContainer) {
  quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Tell your story...",
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
      ],
    },
  });

  const categorySelect = document.getElementById("post-category");
  const subcategorySelect = document.getElementById("post-subcategory");
  const customCategoryInput = document.getElementById("custom-category");
  const customSubcategoryInput = document.getElementById("custom-subcategory");
  const statusBanner = document.getElementById("status-banner");
  const publishBtn = document.getElementById("publish-btn");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");

  const avatarFileInput = document.getElementById("author-avatar-file");
  const avatarPreview = document.getElementById("avatar-preview");
  const avatarLabelText = document.getElementById("avatar-label-text");
  let avatarBase64 = null;

  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showStatus("Image error: Avatar file must be under 2MB.");
        avatarFileInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = function (evt) {
        avatarBase64 = evt.target.result;
        avatarPreview.src = avatarBase64;
        avatarPreview.classList.remove("hidden");
        avatarLabelText.textContent = "✓ Change Avatar";
      };
      reader.readAsDataURL(file);
    });
  }

  function updateSubcategories() {
    const selectedCategory = categorySelect.value;
    if (selectedCategory === "Other") {
      customCategoryInput.style.display = "block";
      customSubcategoryInput.style.display = "block";
      subcategorySelect.style.display = "none";
    } else {
      customCategoryInput.style.display = "none";
      subcategorySelect.style.display = "block";

      const subs = subcategoriesMap[selectedCategory] || [];
      subcategorySelect.innerHTML = "";
      subs.forEach((sub) => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;
        subcategorySelect.appendChild(option);
      });
      const otherSubOption = document.createElement("option");
      otherSubOption.value = "Other";
      otherSubOption.textContent = "+ Add New Topic...";
      subcategorySelect.appendChild(otherSubOption);
      customSubcategoryInput.style.display = "none";
    }
  }

  categorySelect.addEventListener("change", updateSubcategories);
  subcategorySelect.addEventListener("change", (e) => {
    customSubcategoryInput.style.display =
      e.target.value === "Other" ? "block" : "none";
  });

  updateSubcategories();

  function showStatus(msg, isSuccess = false) {
    statusBanner.textContent = msg;
    statusBanner.className = `status-banner ${isSuccess ? "success" : "error"}`;
    statusBanner.classList.remove("hidden");
  }

  publishBtn.addEventListener("click", async () => {
    statusBanner.classList.add("hidden");

    const lastPublish = localStorage.getItem("last_publish_timestamp");
    const now = Date.now();
    if (lastPublish && now - parseInt(lastPublish) < 30000) {
      const waitSecs = Math.ceil(
        (30000 - (now - parseInt(lastPublish))) / 1000,
      );
      return showStatus(
        `Rate limit: Please wait ${waitSecs} seconds before publishing another post.`,
      );
    }

    const title = document.getElementById("post-title").value.trim();
    const author = document.getElementById("author-name").value.trim();
    const role = document.getElementById("post-role").value;

    const selectedCategory = categorySelect.value;
    const selectedSubcategory = subcategorySelect.value;

    const category =
      selectedCategory === "Other"
        ? customCategoryInput.value.trim()
        : selectedCategory;
    const subcategory =
      selectedCategory === "Other" || selectedSubcategory === "Other"
        ? customSubcategoryInput.value.trim()
        : selectedSubcategory;

    const content = quill.root.innerHTML;
    const textLength = quill.getText().trim().length;

    if (!title) return showStatus("Article Title is required.");
    if (!author) return showStatus("Author Name is required.");
    if (!category) return showStatus("Category selection is required.");
    if (!subcategory)
      return showStatus("Subcategory/Topic selection is required.");
    if (textLength === 0) return showStatus("Article content cannot be empty.");

    publishBtn.disabled = true;
    btnText.textContent = "Publishing...";
    btnSpinner.classList.remove("hidden");

    try {
      await db.collection("articles").add({
        title: title,
        author: author,
        authorAvatar: avatarBase64 || null,
        role: role,
        category: category,
        subcategory: subcategory,
        content: content,
        views: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      localStorage.setItem("last_publish_timestamp", Date.now().toString());

      showStatus("Article published successfully! Redirecting...", true);
      setTimeout(() => {
        window.location.href = "feed.html";
      }, 1200);
    } catch (err) {
      console.error("Publishing error:", err);
      showStatus("Unsuccessful: Failed to save article.");
      publishBtn.disabled = false;
      btnText.textContent = "Publish Article";
      btnSpinner.classList.add("hidden");
    }
  });
}
