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

  // Fetch a JSON data file, bypassing the browser cache; resolves to null on any failure
  function fetchJSON(path) {
    return fetch(path + '?t=' + Date.now())
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
        return res.json();
      })
      .catch((err) => {
        console.error('Error loading ' + path + ':', err);
        return null;
      });
  }

  /* ==========================================================================
     1. PUBLICATIONS (from Article.csv)
     ========================================================================== */
  function initPublications() {
    const csvFilePath = 'Article.csv';

    if (typeof Papa === 'undefined') {
      console.error('PapaParse is required for parsing Article.csv');
      return;
    }

    // Citation counts are refreshed nightly by scripts/update_citations.py (GitHub Action)
    const citationsPromise = fetchJSON('assets/data/citations.json');

    fetch(csvFilePath + '?t=' + Date.now())
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch ' + csvFilePath);
        return res.text();
      })
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: async function (results) {
            const citations = await citationsPromise;
            const citationMap = (citations && citations.papers) || {};
            allPublications = results.data
              .filter((p) => p['Paper Name'] && p['Paper Name'].trim())
              .map((p, index) => {
                const type = (p.type || 'other').toLowerCase().trim();
                return {
                  ...p,
                  id: `pub-${type}-${(p.Number || '').trim() || 'x' + index}`,
                  Year: (p.Year || '').trim(),
                  type: type,
                  title: (p['Paper Name'] || '').trim(),
                  authors: (p.Authors || '').trim(),
                  venue: (p.Venue || '').trim(),
                  abstract: (p.Abstract || '').trim(),
                  link: (p.Link || '').trim(),
                  addedDate: (p.AddedDate || '').trim(),
                  number: (p.Number || '').trim(),
                  citations: (citationMap[normalizeTitle(p['Paper Name'])] || {}).citations || 0,
                  citationSources: citationMap[normalizeTitle(p['Paper Name'])] || null,
                };
              });

            // Sort publications: newest year first, then AddedDate
            allPublications.sort((a, b) => {
              const yDiff = parseInt(b.Year || 0) - parseInt(a.Year || 0);
              if (yDiff !== 0) return yDiff;
              return parseEuropeanDate(b.addedDate) - parseEuropeanDate(a.addedDate);
            });

            renderCitationSummary(citations);
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

  // "d/m/yyyy" -> timestamp (0 when missing or malformed, so sorting never sees NaN)
  function parseEuropeanDate(dateStr) {
    const parts = (dateStr || '').split('/').map((n) => parseInt(n, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
  }

  function setupPublicationControls() {
    // 1. Setup Type Filter Buttons
    const typeButtons = document.querySelectorAll('#publication-filters li');
    typeButtons.forEach((btn) => {
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('aria-pressed', btn.classList.contains('filter-active'));
      const activate = () => {
        typeButtons.forEach((b) => {
          b.classList.remove('filter-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('filter-active');
        btn.setAttribute('aria-pressed', 'true');
        currentTypeFilter = btn.getAttribute('data-filter') || 'all';
        renderPublications();
      };
      btn.addEventListener('click', activate);
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
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

  // Must match norm() in scripts/update_citations.py
  function normalizeTitle(title) {
    return (title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // Total citations line under the publication toolbar
  // Prefers the Google Scholar profile total (like Scholar itself shows), else the per-paper sum.
  function renderCitationSummary(citations) {
    const el = document.getElementById('pub-citation-summary');
    if (!el) return;
    const scholar = (citations && citations.scholar) || null;
    const paperSum = allPublications.reduce((sum, p) => sum + p.citations, 0);
    const total = (scholar && scholar.total_citations) || paperSum;
    if (!total) {
      el.hidden = true;
      return;
    }
    const parts = [`<strong>${total.toLocaleString('en-US')}</strong> citations`];
    if (scholar && scholar.h_index) parts.push(`h-index <strong>${escapeHtml(scholar.h_index)}</strong>`);
    if (citations.updated) parts.push(`updated ${escapeHtml(citations.updated)}`);
    const source = scholar && scholar.total_citations
      ? `<a href="https://scholar.google.com/citations?user=${encodeURIComponent(scholar.user_id)}" target="_blank" rel="noopener noreferrer">Google Scholar</a>`
      : 'OpenAlex &amp; Semantic Scholar';
    el.innerHTML = `<i class="bi bi-graph-up-arrow"></i> ${parts.join(' · ')} <span class="pub-citation-source">(${source})</span>`;
    el.hidden = false;
  }

  // Tooltip for a paper's citation badge: count per source
  function citationTooltip(src) {
    if (!src) return '';
    const names = [['google_scholar', 'Google Scholar'], ['openalex', 'OpenAlex'], ['semantic_scholar', 'Semantic Scholar']];
    return names
      .filter(([k]) => Number.isInteger(src[k]))
      .map(([k, label]) => `${label} ${src[k]}`)
      .join(' · ');
  }

  function updateCounts() {
    const journalCount = allPublications.filter((p) => p.type === 'journal').length;
    const conferenceCount = allPublications.filter((p) => p.type === 'conference').length;
    const magazineCount = allPublications.filter((p) => p.type === 'magazine').length;
    const totalCount = allPublications.length;

    const jEl = document.getElementById('journal-count');
    const cEl = document.getElementById('conference-count');
    const mEl = document.getElementById('magazine-count');
    const tEl = document.getElementById('total-pub-count');

    if (jEl) jEl.textContent = journalCount;
    if (cEl) cEl.textContent = conferenceCount;
    if (mEl) mEl.textContent = magazineCount;
    if (tEl) tEl.textContent = totalCount;

    const statPubEl = document.getElementById('stat-pub-count');
    if (statPubEl) statPubEl.textContent = totalCount;
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
      const isMagazine = pub.type === 'magazine';
      let typeBadgeClass = 'badge-conference';
      let typeLabel = '🎤 Conference';
      let numPrefix = 'C';
      if (isJournal) {
        typeBadgeClass = 'badge-journal';
        typeLabel = '📘 Journal';
        numPrefix = 'J';
      } else if (isMagazine) {
        typeBadgeClass = 'badge-magazine';
        typeLabel = '📰 Magazine & Notes';
        numPrefix = 'M';
      }
      const numberBadge = numPrefix + (pub.number || '');

      // Format authors: highlight Vincenzo De Martino
      const formattedAuthors = formatAuthors(pub.authors);

      // Generate BibTeX snippet
      const bibtexCode = generateBibTeX(pub);

      card.innerHTML = `
        <div class="pub-card-header">
          <div class="pub-badges">
            <span class="pub-type-badge ${typeBadgeClass}">${typeLabel} ${numberBadge ? `<span class="pub-badge-num">${numberBadge}</span>` : ''}</span>
            <span class="pub-year-badge"><i class="bi bi-calendar3"></i> ${escapeHtml(pub.Year)}</span>
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
            <button class="pub-btn-abstract" type="button" aria-expanded="false" aria-controls="${pub.id}-abstract" data-abstract="${pub.id}">
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
            <a href="${escapeHtml(pub.link)}" target="_blank" rel="noopener noreferrer" class="btn-pub-action btn-pub-primary">
              <i class="${pub.link.startsWith('http') ? 'bi bi-box-arrow-up-right' : 'bi bi-file-earmark-pdf'}"></i>
              <span>${pub.link.startsWith('http') ? 'Publisher Link' : 'Download PDF'}</span>
            </a>
          `
              : ''
          }
          <button type="button" class="btn-pub-action btn-pub-outline btn-copy-bibtex" data-bibtex="${encodeURIComponent(bibtexCode)}">
            <i class="bi bi-quote"></i> <span>Cite (BibTeX)</span>
          </button>
          ${
            pub.citations > 0
              ? `
            <a href="https://scholar.google.com/scholar?q=${encodeURIComponent('"' + pub.title + '"')}" target="_blank" rel="noopener noreferrer"
              class="btn-pub-action btn-pub-outline btn-pub-cited" title="${escapeHtml(citationTooltip(pub.citationSources))}">
              <i class="bi bi-graph-up-arrow"></i> <span>Cited by <strong>${pub.citations}</strong></span>
            </a>
          `
              : ''
          }
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
    const ascii = (str) => (str || '').normalize('NFD').replace(/[^a-zA-Z0-9]/g, '');
    const authorList = (pub.authors || '').split(',').map((a) => a.trim()).filter(Boolean);
    const firstAuthor = ascii((authorList[0] || '').split(' ').pop()) || 'demartino';
    const firstWord = ascii((pub.title || '').split(/\s+/)[0]).slice(0, 12) || 'paper';
    const citeKey = `${firstAuthor}${pub.Year || ''}${firstWord}`.toLowerCase();
    const url = pub.link ? new URL(pub.link, window.location.href).href : '';

    const isArticle = pub.type === 'journal' || pub.type === 'magazine';
    const fields = [
      ['author', authorList.join(' and ')],
      ['title', `{${pub.title}}`], // double braces keep the original capitalisation
      [isArticle ? 'journal' : 'booktitle', pub.venue],
      ['year', pub.Year],
    ];
    if (url) fields.push(['url', url]);
    const body = fields.map(([k, v]) => `  ${k.padEnd(9)} = {${v}}`).join(',\n');
    return `@${isArticle ? 'article' : 'inproceedings'}{${citeKey},\n${body}\n}`;
  }

  // Abstract toggle (one delegated listener; survives re-renders)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.pub-btn-abstract');
    if (btn) toggleAbstract(btn.getAttribute('data-abstract'));
  });

  function toggleAbstract(id) {
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
  }

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
    fetchJSON('assets/data/students.json').then((data) => {
      if (data) renderStudents(data);
    });
  }

  function renderStudents(data) {
    const currentContainer = document.getElementById('students-current-list');
    const graduatedContainer = document.getElementById('students-graduated-list');

    if (currentContainer && data.current) {
      currentContainer.innerHTML = data.current
        .map((s) => {
          return `
          <div class="student-card student-current">
            <div class="student-status-badge ongoing"><span class="pulse-dot"></span> ${escapeHtml(s.status || 'Active')}</div>
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
      const sortedGraduated = [...data.graduated].sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
      graduatedContainer.innerHTML = sortedGraduated
        .map((s) => {
          return `
          <div class="student-card student-graduated">
            <div class="student-status-badge alumni"><i class="bi bi-mortarboard"></i> ${escapeHtml(s.status || 'Alumni')}</div>
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
    fetchJSON('assets/data/services.json').then((data) => {
      if (data) renderServices(data);
    });
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
                  ? `<span class="service-tag tag-instructor"><i class="bi bi-person"></i> with <a href="${escapeHtml(ta.instructor_link || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(ta.instructor)}</a></span>`
                  : ''
              }
            </div>
            <p class="service-location"><i class="bi bi-building"></i> ${escapeHtml(ta.institution)} (${escapeHtml(ta.country)})</p>
          </div>
        `;
        })
        .join('');
    }

    // 3. Editorial Roles & Guest Editorships (Top of Journals)
    const editorialContainer = document.getElementById('service-editorial-list');
    if (editorialContainer) {
      if (data.editorial_roles && data.editorial_roles.length > 0) {
        editorialContainer.innerHTML = data.editorial_roles
          .map((item) => {
            const publisherClass = (item.publisher || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
            return `
            <div class="editorial-role-card">
              <div class="editorial-card-header">
                <div class="editorial-badges-wrap">
                  <span class="badge-editorial-role"><span class="pulse-dot"></span> ${escapeHtml(item.role)}</span>
                  <span class="badge-publisher pub-${publisherClass}">${escapeHtml(item.publisher || 'Journal')}</span>
                  ${item.badge ? `<span class="badge-tier">${escapeHtml(item.badge)}</span>` : ''}
                </div>
                ${item.period ? `<span class="editorial-period"><i class="bi bi-calendar3"></i> ${escapeHtml(item.period)}</span>` : ''}
              </div>

              <div class="editorial-journal-title">
                <i class="bi bi-journal-richtext"></i>
                <span>${escapeHtml(item.journal)}</span>
              </div>

              ${
                item.special_issue
                  ? `<div class="editorial-si-title"><strong>Special Issue:</strong> "${escapeHtml(item.special_issue)}"</div>`
                  : ''
              }

              ${item.description ? `<p class="editorial-description">${escapeHtml(item.description)}</p>` : ''}

              ${
                item.link
                  ? `
                <div class="editorial-actions">
                  <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="editorial-link-btn">
                    <i class="bi bi-box-arrow-up-right"></i> <span>View Journal / Special Issue</span>
                  </a>
                </div>
              `
                  : ''
              }
            </div>
          `;
          })
          .join('');
        editorialContainer.style.display = 'grid';
      } else {
        editorialContainer.innerHTML = '';
        editorialContainer.style.display = 'none';
      }
    }

    // 4. Reviewers (International Journals)
    const reviewerContainer = document.getElementById('service-reviewer-list');
    if (reviewerContainer && data.reviewers) {
      reviewerContainer.innerHTML = data.reviewers
        .map((rev) => {
          const publisherClass = (rev.publisher || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
          return `
          <div class="journal-reviewer-card">
            <div class="journal-icon"><i class="bi bi-journal-check"></i></div>
            <div class="journal-details">
              <h4 class="journal-name">${escapeHtml(rev.journal)}</h4>
              <div class="journal-badges">
                <span class="badge-publisher pub-${publisherClass}">${escapeHtml(rev.publisher || 'Journal')}</span>
                ${rev.badge ? `<span class="badge-tier">${escapeHtml(rev.badge)} ${parseInt(rev.badge, 10) === 1 ? 'review' : 'reviews'}</span>` : ''}
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      const statJournalsEl = document.getElementById('stat-journals-count');
      if (statJournalsEl) statJournalsEl.textContent = data.reviewers.length;

      // Total reviews: sum of every journal's badge count, so it updates with the data
      const totalEl = document.getElementById('service-reviewer-total');
      if (totalEl) {
        const totalReviews = data.reviewers.reduce((sum, rev) => sum + (parseInt(rev.badge, 10) || 0), 0);
        const journalCount = data.reviewers.length;
        totalEl.innerHTML = `<i class="bi bi-check2-circle"></i> <strong>${totalReviews}</strong> reviews across <strong>${journalCount}</strong> international journals`;
        totalEl.hidden = totalReviews === 0;
      }
    }

    // 4. Organizing Committee & PC Member
    const ocContainer = document.getElementById('service-oc-list');
    if (ocContainer && data.organizing_committee) {
      // Newest first: by year, then by the month named in "date" (e.g. "June 13 - 17, 2027")
      const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthOf = (item) => MONTHS.indexOf(String(item.date || '').trim().slice(0, 3).toLowerCase());
      const sortedOC = [...data.organizing_committee].sort(
        (a, b) => (b.year || 0) - (a.year || 0) || monthOf(b) - monthOf(a)
      );
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
              ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.event)} <i class="bi bi-box-arrow-up-right"></i></a>` : escapeHtml(item.event)}
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
    if (r.includes('board') || r.includes('steering')) return 'role-board';
    if (r.includes('chair')) return 'role-chair';
    if (r.includes('junior pc')) return 'role-junior-pc';
    if (r.includes('program committee') || r.includes('pc')) return 'role-pc';
    if (r.includes('local arrangement')) return 'role-local';
    return 'role-reviewer';
  }

  // --- Research Projects ---
  function loadProjects() {
    fetchJSON('assets/data/projects.json').then((data) => {
      if (data) renderProjects(data);
    });
  }

  function renderProjects(projects) {
    if (!Array.isArray(projects)) return;
    const projCountEl = document.getElementById('stat-projects-count');
    if (projCountEl) projCountEl.textContent = projects.length;

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

      // Clipboard API is missing on non-HTTPS pages (e.g. file://)
      const copy = navigator.clipboard ? navigator.clipboard.writeText(rawBibtex) : Promise.reject();
      copy
        .then(() => {
          if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-check2"></i> <span>Copied!</span>';
          btn.classList.add('copied');

          showToast('BibTeX citation copied to clipboard!');

          clearTimeout(btn._copyTimer);
          btn._copyTimer = setTimeout(() => {
            btn.innerHTML = btn.dataset.originalHtml;
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
    toast.setAttribute('role', 'status');
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Utility escape HTML
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
