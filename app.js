let lessons = [];
let current = 0;
let editorInstance = null; // Store Monaco instance
let completedLessons = JSON.parse(localStorage.getItem('halacoding_progress')) || [];

async function loadLessons() {
    // 0. Initialize Monaco First
    await initMonaco();
    // ... (rest of function)




    try {
        const response = await fetch("web_dev_academy_modules.json");
        const modules = await response.json();

        // Flatten modules -> lessons
        lessons = [];
        modules.forEach(mod => {
            mod.lessons.forEach((lesson, index) => {
                // Feature: Move "Example/Material" to Content Area, keep Editor clean for the user
                let combinedContent = `**${mod.description}**\n\n${lesson.content}`;

                if (lesson.example) {
                    combinedContent += `\n\n**Contoh Kode:**\n\`\`\`\n${lesson.example}\n\`\`\``;
                }

                combinedContent += `\n\n**Tantangan:**\n${lesson.challenge}`;

                // Create a clean starter for the editor
                const isHtml = lesson.title.toLowerCase().includes('html') || lesson.title.toLowerCase().includes('css');
                const commentChar = isHtml ? "<!-- " : "// ";
                const commentEnd = isHtml ? " -->" : "";

                const starterCode = `${commentChar}Tantangan: ${lesson.challenge}${commentEnd}\n${commentChar}Tulis jawabanmu di bawah ini:${commentEnd}\n\n`;

                lessons.push({
                    title: `${mod.title} - ${lesson.title}`,
                    content: combinedContent,
                    starter: starterCode,
                    test: lesson.test
                });
            });

            // ADD PROJECT AS A LESSON
            if (mod.project) {
                let projectContent = `### 🎯 Misi: ${mod.project.task}\n\n**Spesifikasi:**\n`;

                if (mod.project.requirements) {
                    mod.project.requirements.forEach(req => {
                        projectContent += `- ${req}\n`;
                    });
                }

                if (mod.project.folder_structure) {
                    projectContent += `\n**Struktur Folder:**\n\`\`\`\n${mod.project.folder_structure}\n\`\`\`\n`;
                }

                if (mod.project.steps) {
                    projectContent += `\n**Langkah-langkah:**\n`;
                    mod.project.steps.forEach(step => {
                        projectContent += `- ${step}\n`;
                    });
                }

                const isHtml = mod.title.toLowerCase().includes('html') || mod.title.toLowerCase().includes('css');
                const commentChar = isHtml ? "<!-- " : "// ";
                const commentEnd = isHtml ? " -->" : "";

                lessons.push({
                    title: `🎯 PROYEK: ${mod.project.title}`,
                    content: projectContent,
                    starter: "", // No starter needed for local project
                    test: "return true",
                    isProject: true // Flag
                });
            }
        });

        renderSidebar();
        loadLesson(0);
    } catch (e) {
        const statusBar = document.getElementById("status-bar");
        if (statusBar) {
            statusBar.textContent = "Gagal memuat materi: " + e.message;
            statusBar.style.background = "#f8d7da";
        } else {
            console.error("Critical Error & UI Missing:", e);
            alert("Gagal memuat materi: " + e.message + "\n(Coba Hard Refresh browser Anda)");
        }
    }
}

function initMonaco() {
    return new Promise((resolve) => {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            editorInstance = monaco.editor.create(document.getElementById('editor-container'), {
                value: '// Loading...',
                language: 'html', // Default to HTML since many lessons are HTML
                theme: 'vs-dark', // Codecademy style dark theme
                minimap: { enabled: false }, // Cleaner look
                fontSize: 14,
                automaticLayout: true // Adjusts when container resizes
            });
            resolve();
        });
    });
}

function renderSidebar() {
    const sidebar = document.getElementById("lesson-list");

    if (!sidebar) {
        console.warn("Element #lesson-list not found, falling back to #sidebar");
        return;
    }

    // Update Progress Bar
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    if (progressFill && progressText && lessons.length > 0) {
        const pct = Math.round((completedLessons.length / lessons.length) * 100);
        progressFill.style.width = `${pct}%`;
        progressText.textContent = `${pct}% (${completedLessons.length}/${lessons.length})`;

        // Update Mobile Progress
        const mobileProg = document.getElementById("mobile-progress");
        if (mobileProg) mobileProg.textContent = `${pct}%`;
    }

    sidebar.innerHTML = "";
    lessons.forEach((l, i) => {
        const item = document.createElement("div");
        const titleSpan = document.createElement("span");
        titleSpan.textContent = l.title;
        item.appendChild(titleSpan);

        // Check Lock Status: Locked if previous lesson is not completed
        // Lesson 0 is never locked.
        let isLocked = false;
        if (i > 0 && !completedLessons.includes(i - 1)) {
            isLocked = true;
        }

        if (isLocked) {
            item.classList.add("locked");
            // Remove click handler or just don't add it (pointer-events: none in CSS handles it too)
        } else {
            item.onclick = () => loadLesson(i);
        }

        if (i === current) item.classList.add("active");
        if (completedLessons.includes(i)) item.classList.add("completed");

        sidebar.appendChild(item);
    });
}

function loadLesson(i) {
    if (i >= lessons.length) return;
    current = i;
    renderSidebar();

    // Auto-close mobile menu
    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("open");
        document.body.classList.remove("menu-open");
    }

    const l = lessons[i];
    document.getElementById("lesson-title").textContent = l.title;
    document.getElementById("lesson-content").innerHTML = markedContent(l.content);

    // TOGGLE PROJECT MODE
    if (l.isProject) {
        document.body.classList.add("local-project-mode");
    } else {
        document.body.classList.remove("local-project-mode");
    }

    // Determine Type
    const isHtml = l.starter.trim().startsWith('<') || l.title.toLowerCase().includes('html') || l.title.toLowerCase().includes('css');

    // Update Monaco Editor Content
    if (editorInstance && !l.isProject) {
        editorInstance.setValue(l.starter || "");
        monaco.editor.setModelLanguage(editorInstance.getModel(), isHtml ? 'html' : 'javascript');
    }

    // Reset UI
    const statusBar = document.getElementById("status-bar");
    if (statusBar) {
        statusBar.textContent = l.isProject ? "Misi Proyek Dimulai!" : "Siap dijalankan...";
        statusBar.style.background = "#e9ecef";
        statusBar.style.color = "#495057";
    }

    const outputContainer = document.getElementById("output-container");
    outputContainer.className = isHtml ? "show-preview" : "show-console";

    // Clear outputs
    const iframe = document.getElementById("live-preview");
    iframe.src = "about:blank";
    document.getElementById("console-logs").textContent = ">_ Console Ready";
}

function markedContent(text) {
    if (!text) return '';
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map(part => {
        if (part.startsWith('```')) {
            const code = part.slice(3, -3);
            return `<pre style="background:#2d2d2d; color:#f8f8f2; padding:15px; border-radius:6px; overflow-x:auto; margin:10px 0; font-family:Consolas, monospace;"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
        } else {
            return part
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code style="background:#eee;padding:2px 4px;border-radius:3px;font-family:monospace">$1</code>');
        }
    }).join('');
}

// HANDLER: Finish Project Button
document.getElementById("finish-project-btn").onclick = () => {
    // Save Progress
    if (!completedLessons.includes(current)) {
        completedLessons.push(current);
        localStorage.setItem('halacoding_progress', JSON.stringify(completedLessons));
        renderSidebar();
    }

    // Confetti
    confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
    });

    // Alert
    const statusBar = document.getElementById("status-bar");
    statusBar.textContent = "🎉 Proyek Selesai! Kerja bagus, Coding Expert masa depan! 🚀";
    statusBar.style.background = "#d4edda";
    statusBar.style.color = "#155724";
};

// HANDLER: Run Button
document.getElementById("run-btn").onclick = () => {
    // Get code from MONACO
    const code = editorInstance ? editorInstance.getValue() : "";
    const testCode = lessons[current].test;
    const outputContainer = document.getElementById("output-container");
    const isHtml = outputContainer.classList.contains("show-preview");

    const statusBar = document.getElementById("status-bar");
    statusBar.textContent = "⏳ Memproses...";
    statusBar.style.background = "#e9ecef";
    statusBar.style.color = "#495057";

    // 1. UPDATE LIVE PREVIEW / CONSOLE
    if (isHtml) {
        const iframe = document.getElementById("live-preview");
        // Inject code into iframe
        iframe.srcdoc = code;
    } else {
        // Clear previous logs
        document.getElementById("console-logs").textContent = ">_ Running...\n";
    }

    // 2. RUN VALIDATION
    setTimeout(() => {
        try {
            let result;
            let logs = []; // Storage for console logs

            if (!isHtml) {
                // Capture Console for JS
                const fnBody = [
                    "let logs = [];",
                    "const console = {",
                    "    log: (...args) => logs.push(args.join(' ')),",
                    "    info: (...args) => logs.push('[INFO] ' + args.join(' ')),",
                    "    warn: (...args) => logs.push('[WARN] ' + args.join(' ')),",
                    "    error: (...args) => logs.push('[ERR] ' + args.join(' '))",
                    "};",
                    "try {",
                    code, // Inject raw code safely
                    "} catch (err) {",
                    "    logs.push('RUNTIME ERROR: ' + err.message);",
                    "}",
                    "return logs;"
                ].join('\n');

                const runAndTest = new Function(fnBody);
                logs = runAndTest();
                document.getElementById("console-logs").textContent = ">_ Output:\n" + logs.join('\n');
            }

            // VALIDATION LOGIC
            let passed = false;

            if (isHtml) {
                // HTML Check
                const checkFn = new Function('code', 'answer', testCode);
                try {
                    passed = checkFn(code, code);
                } catch (e) {
                    console.error("Test Logic Error (HTML):", e);
                    passed = false;
                }
            } else {
                // JS Check
                const checkBody = [
                    "let logs = " + JSON.stringify(logs) + ";",
                    "const console = { log: () => {} };", // Mute console during test
                    "try {",
                    code, // User Code Executed to define variables
                    "} catch (err) {}",
                    "// --- TEST START ---",
                    testCode
                ].join('\n');

                const checkFn = new Function('code', 'answer', checkBody);
                try {
                    passed = checkFn(code, code);
                } catch (e) {
                    logs.push("TEST ERROR: " + e.message);
                    document.getElementById("console-logs").textContent = ">_ Output:\n" + logs.join('\n');
                    passed = false;
                }
            }

            if (passed === true) {
                statusBar.textContent = "🎉 Benar! Jawabanmu Tepat.";
                statusBar.style.background = "#d4edda";
                statusBar.style.color = "#155724";

                // 1. Save Progress
                if (!completedLessons.includes(current)) {
                    completedLessons.push(current);
                    localStorage.setItem('halacoding_progress', JSON.stringify(completedLessons));
                    renderSidebar();
                }

                // 2. Trigger Confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

            } else {
                statusBar.textContent = "🤔 Masih salah. Coba perbaiki lagi.";
                statusBar.style.background = "#f8d7da";
                statusBar.style.color = "#721c24";
            }

        } catch (e) {
            statusBar.textContent = "⚠️ Error System: " + e.message;
            console.error(e);
        }
    }, 200);
};

// Mobile Menu Logic
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobile-overlay");

function toggleMenu() {
    sidebar.classList.toggle("open");
    document.body.classList.toggle("menu-open");
}

if (menuToggle) {
    menuToggle.onclick = toggleMenu;
}
if (overlay) {
    overlay.onclick = toggleMenu; // Close when clicking outside
}

// Mobile Menu Logic
// ... (existing code) ...

// Welcome Modal Logic
function checkWelcomeModal() {
    const hasSeenWelcome = localStorage.getItem('halacoding_welcome_seen');
    if (!hasSeenWelcome) { // Show if not set
        const modal = document.getElementById("welcome-modal");
        const btn = document.getElementById("close-modal-btn");

        if (modal && btn) {
            // Delay slightly for effect
            setTimeout(() => {
                modal.classList.add("show");
            }, 500);

            btn.onclick = () => {
                modal.classList.remove("show");
                localStorage.setItem('halacoding_welcome_seen', 'true');

                // Greeting Confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#00A8E8', '#ffffff'] // Brand colors
                });
            };
        }
    }
}

// Start
loadLessons();
checkWelcomeModal();
