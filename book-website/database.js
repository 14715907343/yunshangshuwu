const API_BASE_DB = "http://localhost:3000";

let dbBooks = [];
let dbCurrentBook = null;
let dbCurrentChapters = [];
let dbCurrentChapterIndex = 0;

function escapeHTML(text) {
  if (!text) return "";

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getElement(id) {
  return document.getElementById(id);
}

async function loadBooksFromDatabase() {
  try {
    const res = await fetch(API_BASE_DB + "/api/books");
    const books = await res.json();

    console.log("首页读取到的数据库书籍：", books);

    dbBooks = books;
    renderDatabaseBooks();
    bindDatabaseFilters();
    renderDatabaseRecentReading();

  } catch (error) {
    console.error("读取数据库书籍失败：", error);

    const bookGrid = getElement("bookGrid");
    if (bookGrid) {
      bookGrid.innerHTML = "<p>书籍加载失败，请确认后端 node server.js 正在运行。</p>";
    }
  }
}

function renderDatabaseBooks() {
  const bookGrid = getElement("bookGrid");

  if (!bookGrid) {
    console.error("找不到 bookGrid");
    return;
  }

  bookGrid.innerHTML = "";

  if (!Array.isArray(dbBooks) || dbBooks.length === 0) {
    bookGrid.innerHTML = "<p>暂无书籍，请先在后台上传书籍。</p>";
    return;
  }

  dbBooks.forEach(function (book) {
    const card = document.createElement("div");
    card.className = "book-card";
    card.dataset.title = book.title || "";
    card.dataset.category = book.category || "";

    const coverUrl = book.cover_url
      ? API_BASE_DB + book.cover_url
      : "";

    card.innerHTML = `
      <div class="book-cover">
        ${
          coverUrl
            ? `<img src="${coverUrl}" alt="${escapeHTML(book.title)}封面">`
            : `<div class="empty-cover">${escapeHTML(book.title)}</div>`
        }
      </div>

      <div class="book-meta">
        ${escapeHTML(book.author || "未知作者")} · ${escapeHTML(book.category || "未分类")}
      </div>

      <h3>${escapeHTML(book.title)}</h3>

      <p>${escapeHTML(book.intro || "")}</p>

      <div class="card-actions">
        <button onclick="openDatabaseBook(${book.id})">开始阅读</button>
        <button class="light-button" onclick="addToShelf('${escapeHTML(book.title)}')">加入书架</button>
      </div>
    `;

    bookGrid.appendChild(card);
  });
}

function bindDatabaseFilters() {
  const searchInput = getElement("searchInput");
  const categoryButtons = document.querySelectorAll(".category-button");

  if (searchInput) {
    searchInput.addEventListener("input", filterDatabaseBooks);
  }

  categoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      categoryButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      filterDatabaseBooks();
    });
  });
}

function filterDatabaseBooks() {
  const searchInput = getElement("searchInput");
  const activeCategoryButton = document.querySelector(".category-button.active");

  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const selectedCategory = activeCategoryButton
    ? activeCategoryButton.dataset.category
    : "全部";

  const cards = document.querySelectorAll(".book-card");

  cards.forEach(function (card) {
    const title = (card.dataset.title || "").toLowerCase();
    const category = card.dataset.category || "";

    const matchKeyword = title.includes(keyword);
    const matchCategory =
      selectedCategory === "全部" || category === selectedCategory;

    card.style.display = matchKeyword && matchCategory ? "block" : "none";
  });
}

async function openDatabaseBook(bookId) {
  try {
    const bookRes = await fetch(API_BASE_DB + "/api/books/" + bookId);
    const book = await bookRes.json();

    const chapterRes = await fetch(API_BASE_DB + "/api/books/" + bookId + "/chapters");
    const chapters = await chapterRes.json();

    dbCurrentBook = book;
    dbCurrentChapters = chapters;
    dbCurrentChapterIndex = 0;

    getElement("readerTitle").innerText = book.title;
    getElement("readerContent").innerText = book.intro || "暂无简介。";

    const readerControls = getElement("readerControls");
    if (readerControls) {
      readerControls.style.display = "none";
    }

    hideDatabaseReadingProgress();
    hideDatabaseBottomToolbar();

    const chapterList = getElement("chapterList");
    chapterList.style.display = "flex";
    chapterList.innerHTML = "";

    if (!chapters || chapters.length === 0) {
      chapterList.innerHTML = "<p>这本书还没有上传章节。</p>";
    } else {
      chapters.forEach(function (chapter, index) {
        const button = document.createElement("button");
        button.className = "chapter-button";
        button.innerText = chapter.title;

        button.onclick = function () {
          openDatabaseChapter(index);
        };

        chapterList.appendChild(button);
      });
    }

    getElement("reader").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {
    console.error("打开书籍失败：", error);
    alert("打开书籍失败，请检查后端是否运行。");
  }
}

async function openDatabaseChapter(index) {
  try {
    const chapterInfo = dbCurrentChapters[index];

    if (!chapterInfo) {
      return;
    }

    const res = await fetch(API_BASE_DB + "/api/chapters/" + chapterInfo.id);
    const chapter = await res.json();

    dbCurrentChapterIndex = index;

    getElement("readerTitle").innerText = chapter.title;
    getElement("readerContent").innerText = chapter.content;

    const chapterList = getElement("chapterList");
    const readerControls = getElement("readerControls");

    if (chapterList) {
      chapterList.style.display = "none";
    }

    if (readerControls) {
      readerControls.style.display = "flex";
    }

    showDatabaseBottomToolbar();
    updateDatabaseButtons();
    updateDatabaseReadingProgress();
    saveDatabaseReadingProgress();

    getElement("reader").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {
    console.error("打开章节失败：", error);
    alert("打开章节失败。");
  }
}

function prevDatabaseChapter() {
  if (dbCurrentChapterIndex > 0) {
    openDatabaseChapter(dbCurrentChapterIndex - 1);
  }
}

function nextDatabaseChapter() {
  if (dbCurrentChapterIndex < dbCurrentChapters.length - 1) {
    openDatabaseChapter(dbCurrentChapterIndex + 1);
  }
}

function showDatabaseChapterList() {
  if (!dbCurrentBook) {
    return;
  }

  document.body.classList.remove("immersive-mode");

  const immersiveButton = getElement("immersiveButton");
  if (immersiveButton) {
    immersiveButton.innerText = "沉浸";
  }

  getElement("readerTitle").innerText = dbCurrentBook.title;
  getElement("readerContent").innerText = dbCurrentBook.intro || "暂无简介。";

  const readerControls = getElement("readerControls");
  const chapterList = getElement("chapterList");

  if (readerControls) {
    readerControls.style.display = "none";
  }

  if (chapterList) {
    chapterList.style.display = "flex";
  }

  hideDatabaseReadingProgress();
  hideDatabaseBottomToolbar();

  getElement("reader").scrollIntoView({
    behavior: "smooth"
  });
}

function updateDatabaseButtons() {
  const prevButton = getElement("prevButton");
  const nextButton = getElement("nextButton");

  if (prevButton) {
    prevButton.disabled = dbCurrentChapterIndex === 0;
  }

  if (nextButton) {
    nextButton.disabled = dbCurrentChapterIndex === dbCurrentChapters.length - 1;
  }
}

function updateDatabaseReadingProgress() {
  const readingProgress = getElement("readingProgress");
  const progressFill = getElement("progressFill");
  const progressText = getElement("progressText");
  const chapterText = getElement("chapterText");

  if (!readingProgress || !progressFill || !progressText || !chapterText) {
    return;
  }

  const total = dbCurrentChapters.length;
  const current = dbCurrentChapterIndex + 1;
  const percent = Math.round((current / total) * 100);

  readingProgress.style.display = "block";
  progressFill.style.width = percent + "%";
  progressText.innerText = "阅读进度：" + percent + "%";
  chapterText.innerText = "第 " + current + " / " + total + " 章";
}

function hideDatabaseReadingProgress() {
  const readingProgress = getElement("readingProgress");

  if (readingProgress) {
    readingProgress.style.display = "none";
  }
}

function showDatabaseBottomToolbar() {
  const toolbar = getElement("bottomReaderToolbar");

  if (toolbar) {
    toolbar.classList.add("show");
  }
}

function hideDatabaseBottomToolbar() {
  const toolbar = getElement("bottomReaderToolbar");

  if (toolbar) {
    toolbar.classList.remove("show");
  }
}

function saveDatabaseReadingProgress() {
  if (!dbCurrentBook) {
    return;
  }

  const progress = {
    bookId: dbCurrentBook.id,
    bookTitle: dbCurrentBook.title,
    chapterIndex: dbCurrentChapterIndex
  };

  localStorage.setItem("readingProgress", JSON.stringify(progress));
  renderDatabaseRecentReading();
}

function getDatabaseReadingProgress() {
  const saved = localStorage.getItem("readingProgress");

  if (!saved) {
    return null;
  }

  return JSON.parse(saved);
}

async function continueDatabaseReading() {
  const progress = getDatabaseReadingProgress();

  if (!progress || !progress.bookId) {
    alert("暂无阅读记录。");
    return;
  }

  await openDatabaseBook(progress.bookId);

  if (dbCurrentChapters[progress.chapterIndex]) {
    openDatabaseChapter(progress.chapterIndex);
  }
}

function renderDatabaseRecentReading() {
  const recentBox = getElement("recentReadingBox");

  if (!recentBox) {
    return;
  }

  const progress = getDatabaseReadingProgress();

  if (!progress) {
    recentBox.innerHTML = "<p>暂无阅读记录，开始阅读一本书后会显示在这里。</p>";
    return;
  }

  recentBox.innerHTML = `
    <div class="recent-card">
      <div>
        <h3>${escapeHTML(progress.bookTitle)}</h3>
        <p>上次读到：第 ${progress.chapterIndex + 1} 章</p>
      </div>
      <button onclick="continueDatabaseReading()">继续阅读</button>
    </div>
  `;
}

/* 让原来的按钮也使用数据库版本 */
window.openDatabaseBook = openDatabaseBook;
window.openDatabaseChapter = openDatabaseChapter;

window.prevChapter = prevDatabaseChapter;
window.nextChapter = nextDatabaseChapter;
window.showChapterList = showDatabaseChapterList;
window.continueReading = continueDatabaseReading;

/* 兼容“我的书架”里可能调用 openBook('西游记') 的情况 */
window.openBook = function (title) {
  const book = dbBooks.find(function (item) {
    return item.title === title;
  });

  if (!book) {
    alert("这本书还没有从数据库加载，或数据库中不存在。");
    return;
  }

  openDatabaseBook(book.id);
};

document.addEventListener("DOMContentLoaded", function () {
  loadBooksFromDatabase();
});