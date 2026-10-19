# Graph Report - /Users/gessi/Documents/GitHub/kenz097.github.io  (2026-10-19)

## Corpus Check
- 20 files · ~569,600 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3645 nodes · 6624 edges · 23 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 478 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `contains()` - 140 edges
2. `on` - 87 edges
3. `each()` - 86 edges
4. `off()` - 71 edges
5. `closest()` - 60 edges
6. `Tooltip` - 38 edges
7. `Tooltip` - 38 edges
8. `Tooltip` - 38 edges
9. `Tooltip` - 38 edges
10. `cn` - 38 edges

## Surprising Connections (you probably didn't know these)
- `initCopyFeedback()` --calls--> `closest()`  [INFERRED]
  /Users/gessi/Documents/GitHub/kenz097.github.io/assets/js/academic-loader.js → /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/glightbox/js/glightbox.js
- `l()` --calls--> `closest()`  [INFERRED]
  /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/swiper/swiper-bundle.min.js → /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/glightbox/js/glightbox.js
- `d()` --calls--> `isArray()`  [INFERRED]
  /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/swiper/swiper-bundle.min.js → /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/glightbox/js/glightbox.js
- `off()` --calls--> `bootstrapHandler()`  [INFERRED]
  /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/swiper/swiper-bundle.min.js → /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/bootstrap/js/bootstrap.esm.min.js
- `off()` --calls--> `bootstrapDelegationHandler()`  [INFERRED]
  /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/swiper/swiper-bundle.min.js → /Users/gessi/Documents/GitHub/kenz097.github.io/assets/vendor/bootstrap/js/bootstrap.esm.min.js

## Communities

### Community 0 - "Community 0"
_Manages dynamic placement, styling, and accessibility of overlay components such as dropdowns or tooltips._
Cohesion: 0.01
Nodes (410): addHandler(), allowedAttribute(), alreadyOpen, applyStyles(), applyStyles$1, areValidElements(), ARIA_ATTRIBUTE_PATTERN, arrow() (+402 more)

### Community 1 - "Community 1"
_Manages Bootstrap-style UI components, handling events, keyboard navigation, ARIA attributes, and active states._
Cohesion: 0.01
Nodes (334): addHandler(), allowedAttribute(), alreadyOpen, ARIA_ATTRIBUTE_PATTERN, ARROW_DOWN_KEY, ARROW_DOWN_KEY$1, ARROW_LEFT_KEY, ARROW_LEFT_KEY$1 (+326 more)

### Community 2 - "Community 2"

Cohesion: 0.01
Nodes (327): addHandler(), allowedAttribute(), ARIA_ATTRIBUTE_PATTERN, ARROW_DOWN_KEY, ARROW_DOWN_KEY$1, ARROW_LEFT_KEY, ARROW_LEFT_KEY$1, ARROW_RIGHT_KEY (+319 more)

### Community 3 - "Community 3"

Cohesion: 0.01
Nodes (329): addHandler(), allowedAttribute(), alreadyOpen, ARIA_ATTRIBUTE_PATTERN, ARROW_DOWN_KEY, ARROW_DOWN_KEY$1, ARROW_LEFT_KEY, ARROW_LEFT_KEY$1 (+321 more)

### Community 4 - "Community 4"

Cohesion: 0.01
Nodes (80): contains(), effect$1(), a(), ae, at, b(), be, bt (+72 more)

### Community 5 - "Community 5"

Cohesion: 0.01
Nodes (34): Backdrop, BaseComponent, Carousel, Collapse, Config, Dropdown, enableDismissTrigger(), execute() (+26 more)

### Community 6 - "Community 6"

Cohesion: 0.01
Nodes (31): Alert, BaseComponent, Carousel, Collapse, Config, Dropdown, enableDismissTrigger(), findShadowRoot() (+23 more)

### Community 7 - "Community 7"

Cohesion: 0.02
Nodes (28): Alert, BaseComponent, Carousel, Collapse, Config, Dropdown, enableDismissTrigger(), findShadowRoot() (+20 more)

### Community 8 - "Community 8"

Cohesion: 0.02
Nodes (28): BaseComponent, Carousel, Collapse, Config, Dropdown, enableDismissTrigger(), findShadowRoot(), FocusTrap (+20 more)

### Community 9 - "Community 9"

Cohesion: 0.02
Nodes (19): at, b(), c(), cn, hi, ki, kn, l() (+11 more)

### Community 10 - "Community 10"

Cohesion: 0.02
Nodes (104): _(), a(), ae(), ai, an, bi, bn, Bt() (+96 more)

### Community 11 - "Community 11"

Cohesion: 0.03
Nodes (22): Backdrop, Backdrop, execute(), executeAfterTransition(), getTransitionDurationFromElement(), on, Swipe, Backdrop (+14 more)

### Community 12 - "Community 12"

Cohesion: 0.03
Nodes (61): Alert, Alert, addClass(), addEvent(), animateElement(), _classCallCheck(), closest(), _createClass() (+53 more)

### Community 13 - "Community 13"

Cohesion: 0.04
Nodes (58): glightbox(), $, a(), {activeIndex:t,slides:s,loopedSlides:a,allowSlidePrev:i,allowSlideNext:r,snapGrid:n,rtlTranslate:l}, {animating:i,enabled:r,params:n}, b, c, {classNames:t,params:s,rtl:a,$el:i,device:r,support:n} (+50 more)

### Community 14 - "Community 14"

Cohesion: 0.1
Nodes (55): a(), e(), i(), n(), o(), r(), u(), a() (+47 more)

### Community 15 - "Community 15"

Cohesion: 0.09
Nodes (17): allPublications, btn, buildYearFilters(), chevron, content, currentTypeFilter, currentYearFilter, initAcademicData() (+9 more)

### Community 16 - "Community 16"

Cohesion: 0.12
Nodes (11): getSize(), getStyle(), getStyleSize(), getValueGetter(), getZeroSize(), jQueryBridget(), mungeSorter(), onComplete() (+3 more)

### Community 17 - "Community 17"

Cohesion: 0.1
Nodes (16): backtotop, body, navbarlinks, navbarToggle, on(), portfolioContainer, portfolioFilters, portfolioIsotope (+8 more)

### Community 18 - "Community 18"

Cohesion: 0.35
Nodes (1): ScrollBarHelper

### Community 19 - "Community 19"

Cohesion: 0.36
Nodes (4): _classCallCheck(), HTMLParser(), Initializer(), Typed()

### Community 20 - "Community 20"

Cohesion: 0.25
Nodes (5): action, formData, forms, recaptcha, thisForm

### Community 21 - "Community 21"

Cohesion: 0.53
Nodes (4): i(), n(), s(), t()

### Community 22 - "Community 22"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **1420 isolated node(s):** `navbarlinks`, `backtotop`, `body`, `toggle`, `navbarToggle` (+1415 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 22`** (1 nodes): `contact.php`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.