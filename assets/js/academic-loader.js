/**
 * Academic Data Loader & Interactive Features for kenz097.github.io
 * Dynamically loads and renders Publications (CSV), Services (JSON), Students (JSON), and Projects (JSON).
 */

(function () {
  'use strict';

  // Global state for publications
  let allPublications = [];
  let currentTypeFilter = 'all';
  let currentYearFilter = 'all';
  let searchQuery = '';

  document.addEventListener('DOMContentLoaded', () => {
    initPublications();
    initAcademicData();
    initCopyFeedback();
  });

  /* ==========================================================================
     1. PUBLICATIONS (from Article.csv)
     ========================================================================== */
  function initPublications() {
    const csvFilePath = 'Article.csv';

    if (typeof Papa === 'undefined') {
      console.error('PapaParse is required for parsing Article.csv');
      return;
    }

    fetch(csvFilePath)
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch ' + csvFilePath);
        return res.text();
      })
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: function (results) {
            allPublications = results.data
              .filter((p) => p['Paper Name'] && p['Paper Name'].trim())
              .map((p, index) => {
                return {
                  ...p,
                  id: 'pub-' + (p.Number || index + 1),
                  Year: (p.Year || '').trim(),
                  type: (p.type || 'other').toLowerCase().trim(),
                  title: (p['Paper Name'] || '').trim(),
                  authors: (p.Authors || '').trim(),
                  venue: (p.Venue || '').trim(),
                  abstract: (p.Abstract || '').trim(),
                  link: (p.Link || '').trim(),
                  addedDate: (p.AddedDate || '').trim(),
                  number: (p.Number || '').trim(),
                };
              });

            // Sort publications: newest year first, then AddedDate
            allPublications.sort((a, b) => {
              const yDiff = parseInt(b.Year || 0) - parseInt(a.Year || 0);
              if (yDiff !== 0) return yDiff;
              return parseEuropeanDate(b.addedDate) - parseEuropeanDate(a.addedDate);
            });

            setupPublicationControls();
            renderPublications();
          },
        });
      })
      .catch((err) => {
        console.error('Error loading publications:', err);
        const container = document.getElementById('publication-list');
        if (container) {
          container.innerHTML = '<div class="alert alert-warning">Unable to load publications at this time.</div>';
        }
      });
  }

  function parseEuropeanDate(dateStr) {
    if (!dateStr) return new Date('1970-01-01');
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dateStr);
  }

  function setupPublicationControls() {
    // 1. Setup Type Filter Buttons
    const typeButtons = document.querySelectorAll('#publication-filters li');
    typeButtons.forEach((btn) => {
      btn.addEventListener('click', function () {
        typeButtons.forEach((b) => b.classList.remove('filter-active'));
        this.classList.add('filter-active');
        currentTypeFilter = this.getAttribute('data-filter') || 'all';
        renderPublications();
      });
    });

    // 2. Setup Live Search Input
    const searchInput = document.getElementById('publication-search');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchQuery = (e.target.value || '').toLowerCase().trim();
        renderPublications();
      });
    }

    // 3. Setup Year Quick Filter Pills
    buildYearFilters();
    updateCounts();
  }

  function buildYearFilters() {
    const yearContainer = document.getElementById('publication-year-filters');
    if (!yearContainer) return;

    const years = Array.from(new Set(allPublications.map((p) => p.Year).filter(Boolean))).sort(
      (a, b) => parseInt(b) - parseInt(a)
    );

    yearContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'btn-year-pill active';
    allBtn.textContent = 'All Years';
    allBtn.addEventListener('click', () => {
      document.querySelectorAll('.btn-year-pill').forEach((b) => b.classList.remove('active'));
      allBtn.classList.add('active');
      currentYearFilter = 'all';
      renderPublications();
    });
    yearContainer.appendChild(allBtn);

    years.forEach((yr) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-year-pill';
      btn.textContent = yr;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-year-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentYearFilter = yr;
        renderPublications();
      });
      yearContainer.appendChild(btn);
    });
  }

  function updateCounts() {
    const journalCount = allPublications.filter((p) => p.type === 'journal').length;
    const conferenceCount = allPublications.filter((p) => p.type === 'conference').length;
    const totalCount = allPublications.length;

    const jEl = document.getElementById('journal-count');
    const cEl = document.getElementById('conference-count');
    const tEl = document.getElementById('total-pub-count');

    if (jEl) jEl.textContent = journalCount;
    if (cEl) cEl.textContent = conferenceCount;
    if (tEl) tEl.textContent = totalCount;
  }

  function renderPublications() {
    const listContainer = document.getElementById('publication-list');
    if (!listContainer) return;

    const filtered = allPublications.filter((pub) => {
      // Type filter
      if (currentTypeFilter !== 'all' && pub.type !== currentTypeFilter) {
        return false;
      }
      // Year filter
      if (currentYearFilter !== 'all' && pub.Year !== currentYearFilter) {
        return false;
      }
      // Search query
      if (searchQuery) {
        const textBlob = `${pub.title} ${pub.authors} ${pub.venue} ${pub.Year} ${pub.abstract}`.toLowerCase();
        if (!textBlob.includes(searchQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="pub-empty-state">
          <i class="bi bi-search"></i>
          <p>No publications found matching your criteria.</p>
        </div>`;
      return;
    }

    listContainer.innerHTML = '';

    filtered.forEach((pub) => {
      const card = document.createElement('article');
      card.className = 'pub-modern-card';
      card.setAttribute('data-type', pub.type);

      const isJournal = pub.type === 'journal';
      const typeBadgeClass = isJournal ? 'badge-journal' : 'badge-conference';
      const typeLabel = isJournal ? '📘 Journal' : '🎤 Conference';
      const numberBadge = (isJournal ? 'J' : 'C') + (pub.number || '');

      // Format authors: highlight Vincenzo De Martino
      const formattedAuthors = formatAuthors(pub.authors);

      // Generate BibTeX snippet
      const bibtexCode = generateBibTeX(pub);

      card.innerHTML = `
        <div class="pub-card-header">
          <div class="pub-badges">
            <span class="pub-type-badge ${typeBadgeClass}">${typeLabel} ${numberBadge ? `<span class="pub-badge-num">${numberBadge}</span>` : ''}</span>
            <span class="pub-year-badge"><i class="bi bi-calendar3"></i> ${pub.Year}</span>
          </div>
        </div>

        <h3 class="pub-title">${escapeHtml(pub.title)}</h3>

        <div class="pub-venue">
          <i class="bi bi-journal-bookmark-fill"></i>
          <span>${escapeHtml(pub.venue)}</span>
        </div>

        <div class="pub-authors">
          <i class="bi bi-people"></i>
          <span>${formattedAuthors}</span>
        </div>

        ${
          pub.abstract
            ? `
          <div class="pub-abstract-wrapper">
            <button class="pub-btn-abstract" type="button" aria-expanded="false" onclick="toggleAbstract('${pub.id}')">
              <i class="bi bi-text-paragraph"></i> <span>Show Abstract</span> <i class="bi bi-chevron-down chevron-icon"></i>
            </button>
            <div id="${pub.id}-abstract" class="pub-abstract-content" style="display: none;">
              <p>${escapeHtml(pub.abstract)}</p>
            </div>
          </div>
        `
            : ''
        }

        <div class="pub-actions">
          ${
            pub.link
              ? `
            <a href="${pub.link}" target="_blank" rel="noopener noreferrer" class="btn-pub-action btn-pub-primary">
              <i class="${pub.link.startsWith('http') ? 'bi bi-box-arrow-up-right' : 'bi bi-file-earmark-pdf'}"></i>
              <span>${pub.link.startsWith('http') ? 'Publisher Link' : 'Download PDF'}</span>
            </a>
          `
              : ''
          }
          <button type="button" class="btn-pub-action btn-pub-outline btn-copy-bibtex" data-bibtex="${encodeURIComponent(bibtexCode)}">
            <i class="bi bi-quote"></i> <span>Cite (BibTeX)</span>
          </button>
        </div>
      `;

      listContainer.appendChild(card);
    });
  }

  // Format author names & bold Vincenzo De Martino
  function formatAuthors(authorsStr) {
    if (!authorsStr) return '';
    const authorsArray = authorsStr.split(', ');
    return authorsArray
      .map((author) => {
        const cleanAuthor = author.trim();
        if (cleanAuthor === 'Vincenzo De Martino') {
          return '<strong class="highlight-author">V. De Martino</strong>';
        }
        const parts = cleanAuthor.split(' ');
        if (parts.length > 1) {
          return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
        }
        return cleanAuthor;
      })
      .join(', ');
  }

  // Generate clean BibTeX entry
  function generateBibTeX(pub) {
    const firstAuthor = (pub.authors || '').split(',')[0].trim().split(' ').pop() || 'DeMartino';
    const firstWord = (pub.title || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'paper';
    const citeKey = `${firstAuthor.toLowerCase()}${pub.Year || ''}${firstWord.toLowerCase()}`;

    if (pub.type === 'journal') {
      return `@article{${citeKey},
  author    = {${pub.authors}},
  title     = {${pub.title}},
  journal   = {${pub.venue}},
  year      = {${pub.Year}}${pub.link ? `,\n  url       = {${pub.link}}` : ''}
}`;
    } else {
      return `@inproceedings{${citeKey},
  author    = {${pub.authors}},
  title     = {${pub.title}},
  booktitle = {${pub.venue}},
  year      = {${pub.Year}}${pub.link ? `,\n  url       = {${pub.link}}` : ''}
}`;
    }
  }

  // Abstract toggle exposed to global window
  window.toggleAbstract = function (id) {
    const content = document.getElementById(`${id}-abstract`);
    if (!content) return;
    const btn = content.previousElementSibling;
    const isHidden = content.style.display === 'none';

    if (isHidden) {
      content.style.display = 'block';
      if (btn) {
        btn.setAttribute('aria-expanded', 'true');
        btn.querySelector('span').textContent = 'Hide Abstract';
        const chevron = btn.querySelector('.chevron-icon');
        if (chevron) chevron.classList.replace('bi-chevron-down', 'bi-chevron-up');
      }
    } else {
      content.style.display = 'none';
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.querySelector('span').textContent = 'Show Abstract';
        const chevron = btn.querySelector('.chevron-icon');
        if (chevron) chevron.classList.replace('bi-chevron-up', 'bi-chevron-down');
      }
    }
  };

  /* ==========================================================================
     2. ACADEMIC DATA (Services, Students, Projects JSON)
     ========================================================================== */
  function initAcademicData() {
    loadStudents();
    loadServices();
    loadProjects();
  }

  // --- Students ---
  function loadStudents() {
    fetch('assets/data/students.json')
      .then((res) => res.json())
      .then((data) => {
        renderStudents(data);
      })
      .catch((err) => console.error('Error loading students.json:', err));
  }

  function renderStudents(data) {
    const currentContainer = document.getElementById('students-current-list');
    const graduatedContainer = document.getElementById('students-graduated-list');

    if (currentContainer && data.current) {
      currentContainer.innerHTML = data.current
        .map((s) => {
          return `
          <div class="student-card student-current">
            <div class="student-status-badge ongoing"><span class="pulse-dot"></span> ${s.status || 'Active'}</div>
            <h4 class="student-name">${escapeHtml(s.name)}</h4>
            <div class="student-meta">
              <span class="badge-degree">${escapeHtml(s.level)}</span>
              <span class="student-year"><i class="bi bi-calendar-check"></i> ${escapeHtml(s.year)}</span>
            </div>
            <p class="student-institution"><i class="bi bi-building"></i> ${escapeHtml(s.institution)} (${escapeHtml(s.location)})</p>
          </div>
        `;
        })
        .join('');
    }

    if (graduatedContainer && data.graduated) {
      // Sort graduated by year descending
      const sortedGraduated = [...data.graduated].sort((a, b) => parseInt(b.year) - parseInt(a.year));
      graduatedContainer.innerHTML = sortedGraduated
        .map((s) => {
          return `
          <div class="student-card student-graduated">
            <div class="student-status-badge alumni"><i class="bi bi-mortarboard"></i> ${s.status || 'Alumni'}</div>
            <h4 class="student-name">${escapeHtml(s.name)}</h4>
            <div class="student-meta">
              <span class="badge-degree alumni-degree">${escapeHtml(s.level)}</span>
              <span class="student-year"><i class="bi bi-calendar3"></i> Graduated ${escapeHtml(s.year)}</span>
            </div>
            <p class="student-institution"><i class="bi bi-building"></i> ${escapeHtml(s.institution)}</p>
          </div>
        `;
        })
        .join('');
    }

    // Update stats count in summary pill if exists
    const studentCountEl = document.getElementById('stat-students-count');
    if (studentCountEl && data.current && data.graduated) {
      studentCountEl.textContent = data.current.length + data.graduated.length;
    }
  }

  // --- Services ---
  function loadServices() {
    fetch('assets/data/services.json')
      .then((res) => res.json())
      .then((data) => {
        renderServices(data);
      })
      .catch((err) => console.error('Error loading services.json:', err));
  }

  function renderServices(data) {
    // 1. Co-Lecture
    const coLectureContainer = document.getElementById('service-colecture-list');
    if (coLectureContainer && data.co_lecture) {
      coLectureContainer.innerHTML = data.co_lecture
        .map((c) => {
          return `
          <div class="service-item-card">
            <div class="service-period-badge">${escapeHtml(c.period)}</div>
            <h4 class="service-item-title">${escapeHtml(c.course)}</h4>
            <div class="service-tags">
              <span class="service-tag tag-level">${escapeHtml(c.level)}</span>
              <span class="service-tag tag-lang"><i class="bi bi-translate"></i> ${escapeHtml(c.language)}</span>
            </div>
            <p class="service-location"><i class="bi bi-geo-alt"></i> ${escapeHtml(c.institution)} (${escapeHtml(c.country)})</p>
          </div>
        `;
        })
        .join('');
    }

    // 2. Teaching Assistant
    const taContainer = document.getElementById('service-ta-list');
    if (taContainer && data.teaching_assistant) {
      taContainer.innerHTML = data.teaching_assistant
        .map((ta) => {
          return `
          <div class="service-item-card">
            <div class="service-period-badge">${escapeHtml(ta.period)}</div>
            <h4 class="service-item-title">${escapeHtml(ta.course)}</h4>
            <div class="service-tags">
              <span class="service-tag tag-level">${escapeHtml(ta.level)}</span>
              <span class="service-tag tag-lang"><i class="bi bi-translate"></i> ${escapeHtml(ta.language)}</span>
              ${
                ta.instructor
                  ? `<span class="service-tag tag-instructor"><i class="bi bi-person"></i> with <a href="${ta.instructor_link || '#'}" target="_blank">${escapeHtml(ta.instructor)}</a></span>`
                  : ''
              }
            </div>
            <p class="service-location"><i class="bi bi-building"></i> ${escapeHtml(ta.institution)} (${escapeHtml(ta.country)})</p>
          </div>
        `;
        })
        .join('');
    }

    // 3. Reviewers (International Journals)
    const reviewerContainer = document.getElementById('service-reviewer-list');
    if (reviewerContainer && data.reviewers) {
      reviewerContainer.innerHTML = data.reviewers
        .map((rev) => {
          const publisherClass = (rev.publisher || '').toLowerCase();
          return `
          <div class="journal-reviewer-card">
            <div class="journal-icon"><i class="bi bi-journal-check"></i></div>
            <div class="journal-details">
              <h4 class="journal-name">${escapeHtml(rev.journal)}</h4>
              <div class="journal-badges">
                <span class="badge-publisher pub-${publisherClass}">${escapeHtml(rev.publisher || 'Journal')}</span>
                ${rev.badge ? `<span class="badge-tier">${escapeHtml(rev.badge)}</span>` : ''}
              </div>
            </div>
          </div>
        `;
        })
        .join('');
    }

    // 4. Organizing Committee & PC Member
    const ocContainer = document.getElementById('service-oc-list');
    if (ocContainer && data.organizing_committee) {
      // Sort by year descending
      const sortedOC = [...data.organizing_committee].sort((a, b) => (b.year || 0) - (a.year || 0));
      ocContainer.innerHTML = sortedOC
        .map((item) => {
          const roleBadgeClass = getRoleBadgeClass(item.role);
          return `
          <div class="committee-card">
            <div class="committee-top">
              <span class="committee-role ${roleBadgeClass}">${escapeHtml(item.role)}</span>
              <span class="committee-year"><i class="bi bi-calendar3"></i> ${escapeHtml(item.date || String(item.year))}</span>
            </div>
            <h4 class="committee-event">
              ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.event)} <i class="bi bi-box-arrow-up-right"></i></a>` : escapeHtml(item.event)}
            </h4>
            <div class="committee-location"><i class="bi bi-geo-alt"></i> ${escapeHtml(item.location)}</div>
          </div>
        `;
        })
        .join('');
    }

    // 5. Volunteers
    const volContainer = document.getElementById('service-volunteers-list');
    if (volContainer && data.volunteers) {
      volContainer.innerHTML = data.volunteers
        .map((v) => {
          return `
          <div class="volunteer-pill">
            <span class="vol-year">${escapeHtml(String(v.year))}</span>
            <span class="vol-event">${escapeHtml(v.event)}</span>
            <span class="vol-loc"><i class="bi bi-geo-alt"></i> ${escapeHtml(v.location)}</span>
          </div>
        `;
        })
        .join('');
    }
  }

  function getRoleBadgeClass(role) {
    if (!role) return 'role-default';
    const r = role.toLowerCase();
    if (r.includes('chair')) return 'role-chair';
    if (r.includes('junior pc')) return 'role-junior-pc';
    if (r.includes('program committee') || r.includes('pc')) return 'role-pc';
    if (r.includes('local arrangement')) return 'role-local';
    return 'role-reviewer';
  }

  // --- Research Projects ---
  function loadProjects() {
    fetch('assets/data/projects.json')
      .then((res) => res.json())
      .then((data) => {
        renderProjects(data);
      })
      .catch((err) => console.error('Error loading projects.json:', err));
  }

  function renderProjects(projects) {
    const container = document.getElementById('research-projects-list');
    if (!container) return;

    container.innerHTML = projects
      .map((proj) => {
        const isOngoing = proj.status === 'Ongoing';
        return `
        <div class="project-modern-card ${isOngoing ? 'card-ongoing' : 'card-completed'}">
          <div class="project-card-top">
            <span class="project-status-badge ${isOngoing ? 'status-ongoing' : 'status-completed'}">
              ${isOngoing ? '<span class="pulse-dot"></span> Active Project' : '<i class="bi bi-check2-circle"></i> Completed'}
            </span>
            <span class="project-code-chip"><i class="bi bi-hash"></i> ${escapeHtml(proj.code)}</span>
          </div>

          <h3 class="project-title">${escapeHtml(proj.title)}</h3>
          <p class="project-type"><i class="bi bi-award"></i> ${escapeHtml(proj.type)}</p>

          <div class="project-role-box">
            <span class="role-label"><i class="bi bi-person-badge"></i> Role:</span>
            <span class="role-desc">${escapeHtml(proj.role)}</span>
          </div>

          ${
            proj.description
              ? `
            <p class="project-description">${escapeHtml(proj.description)}</p>
          `
              : ''
          }

          ${
            proj.funder
              ? `
            <div class="project-funder">
              <i class="bi bi-bank"></i> Funding Agency: <strong>${escapeHtml(proj.funder)}</strong>
            </div>
          `
              : ''
          }
        </div>
      `;
      })
      .join('');
  }

  /* ==========================================================================
     3. CLIPBOARD FEEDBACK & TOAST
     ========================================================================== */
  function initCopyFeedback() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.btn-copy-bibtex');
      if (!btn) return;

      const rawBibtex = decodeURIComponent(btn.getAttribute('data-bibtex') || '');
      if (!rawBibtex) return;

      navigator.clipboard
        .writeText(rawBibtex)
        .then(() => {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-check2"></i> <span>Copied!</span>';
          btn.classList.add('copied');

          showToast('BibTeX citation copied to clipboard!');

          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
          }, 2000);
        })
        .catch(() => {
          prompt('Copy the BibTeX citation manually:', rawBibtex);
        });
    });
  }

  function showToast(msg) {
    let toast = document.getElementById('academic-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'academic-toast';
      toast.className = 'academic-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Utility escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
