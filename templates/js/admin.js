"use strict";
/**
 * Nova Admin UI Logic (TypeScript)
 * ---------------------------------
 * Handles post listing, editing, previewing, saving, and deleting.
 * Communicates with Nova's backend API and updates the DOM.
 */
const $ = (selector) => document.querySelector(selector);
const listEl = $("#postList");
const bodyEl = $("#body");
const previewEl = $("#preview");
const titleEl = $("#fm-title");
const dateEl = $("#fm-date");
const descEl = $("#fm-description");
const saveBtn = $("#save");
const delBtn = $("#delete");
const newBtn = $("#newPost");
const searchEl = $("#search");
const themeToggle = $("#themeToggle");
let currentSlug = null;
let posts = [];
// 🌗 Theme Toggle
function setTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("nova-theme", theme);
}
const savedTheme = localStorage.getItem("nova-theme") || "dark";
setTheme(savedTheme);
themeToggle.onclick = () => {
    const next = document.documentElement.classList.contains("light") ? "dark" : "light";
    setTheme(next);
};
// 📋 Render Post List
function renderList() {
    const q = (searchEl.value || "").toLowerCase();
    listEl.innerHTML = "";
    posts
        .filter(p => {
        if (!q)
            return true;
        return (p.slug.toLowerCase().includes(q) ||
            (p.data.title || "").toLowerCase().includes(q) ||
            (p.data.description || "").toLowerCase().includes(q) ||
            (p.body || "").toLowerCase().includes(q));
    })
        .forEach(p => {
        const li = document.createElement("li");
        const mainText = p.data.title ? `${p.data.title} (${p.slug})` : p.slug;
        const snippet = (p.body || "").slice(0, 80).replace(/\n/g, " ");
        const titleDiv = document.createElement("div");
        titleDiv.textContent = mainText;
        const snippetDiv = document.createElement("div");
        snippetDiv.textContent = snippet ? `“…${snippet}”` : "";
        snippetDiv.style.fontSize = "12px";
        snippetDiv.style.color = "var(--muted)";
        li.appendChild(titleDiv);
        if (snippet)
            li.appendChild(snippetDiv);
        li.onclick = () => openSlug(p.slug);
        listEl.appendChild(li);
    });
}
// 🔍 Live Preview
function updatePreview() {
    previewEl.innerHTML = window.marked.parse(bodyEl.value || "");
}
// 📦 Load All Posts
async function loadList() {
    const res = await fetch("/_nova/api/posts");
    const metaPosts = await res.json();
    const fullPosts = await Promise.all(metaPosts.map(async (p) => {
        const res = await fetch(`/_nova/api/posts/${p.slug}`);
        const full = await res.json();
        return {
            ...p,
            body: full.body || "",
            data: full.data || {}
        };
    }));
    posts = fullPosts;
    renderList();
}
// 📄 Load Single Post
async function openSlug(slug) {
    currentSlug = slug;
    const res = await fetch(`/_nova/api/posts/${slug}`);
    if (!res.ok)
        return alert("Not found");
    const data = await res.json();
    titleEl.value = data.data.title || "";
    dateEl.value = (data.data.date || "").slice(0, 10);
    descEl.value = data.data.description || "";
    bodyEl.value = data.body || "";
    updatePreview();
}
// 💾 Save Post
saveBtn.onclick = async () => {
    if (!currentSlug)
        return;
    const data = {
        title: titleEl.value,
        date: dateEl.value,
        description: descEl.value
    };
    const res = await fetch(`/_nova/api/posts/${currentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, body: bodyEl.value })
    });
    if (res.ok) {
        alert("Saved");
        await loadList();
    }
    else {
        alert("Save failed");
    }
};
// 🗑 Delete Post
delBtn.onclick = async () => {
    if (!currentSlug)
        return;
    if (!confirm("Delete this post?"))
        return;
    const res = await fetch(`/_nova/api/posts/${currentSlug}`, {
        method: "DELETE"
    });
    if (res.ok) {
        alert("Deleted");
        currentSlug = null;
        await loadList();
    }
    else {
        alert("Delete failed");
    }
};
// 🆕 Create New Post
newBtn.onclick = async () => {
    const title = prompt("Title for new post?", "New Post");
    if (!title)
        return;
    const res = await fetch(`/_nova/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
    });
    const js = await res.json();
    await loadList();
    openSlug(js.slug);
};
// 🛠 Markdown Toolbar
document.querySelectorAll(".toolbar button").forEach(btn => {
    btn.addEventListener("click", () => {
        const wrap = btn.getAttribute("data-wrap");
        const wrapEnd = btn.getAttribute("data-wrap-end") || wrap;
        const md = btn.getAttribute("data-md");
        const start = bodyEl.selectionStart;
        const end = bodyEl.selectionEnd;
        const selected = bodyEl.value.slice(start, end);
        const before = bodyEl.value.slice(0, start);
        const after = bodyEl.value.slice(end);
        let insert = "";
        if (wrap) {
            insert = wrap + selected + wrapEnd;
        }
        else if (md) {
            insert = md;
        }
        bodyEl.value = before + insert + after;
        bodyEl.focus();
        bodyEl.selectionStart = bodyEl.selectionEnd = before.length + insert.length;
        updatePreview();
    });
});
// 🔁 Live Updates
bodyEl.addEventListener("input", updatePreview);
searchEl.addEventListener("input", renderList);
// 🚀 Init
loadList();
