(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const revealElements = $$('[data-reveal]');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    revealElements.forEach((element) => revealObserver.observe(element));
    reducedMotion.addEventListener('change', (event) => {
      if (!event.matches) return;
      revealElements.forEach((element) => element.classList.add('is-visible'));
      revealObserver.disconnect();
    });
  }

  const header = $('#site-header');
  if (header) {
    let scrollScheduled = false;
    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      scrollScheduled = false;
    };
    updateHeader();
    window.addEventListener(
      'scroll',
      () => {
        if (scrollScheduled) return;
        scrollScheduled = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true }
    );
  }

  const menuToggle = $('#menu-toggle');
  const mobileMenu = $('#mobile-menu');
  if (menuToggle && mobileMenu) {
    let menuIsOpen = false;
    let hideMenuTimeout;
    let menuFrame;
    const menuFocusables = () =>
      [menuToggle, ...$$('a[href], button:not([disabled]), [tabindex="0"]', mobileMenu)].filter(
        (element) => !element.hidden && element.getClientRects().length > 0
      );

    const closeMenu = (restoreFocus = false, immediate = false) => {
      if (!menuIsOpen) return;
      menuIsOpen = false;
      window.cancelAnimationFrame(menuFrame);
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Открыть меню');
      mobileMenu.classList.remove('is-open');
      mobileMenu.inert = true;
      document.body.classList.remove('menu-open');
      const hide = () => {
        mobileMenu.hidden = true;
      };
      if (reducedMotion.matches || immediate) hide();
      else hideMenuTimeout = window.setTimeout(hide, 300);
      if (restoreFocus) menuToggle.focus({ preventScroll: true });
    };

    const openMenu = () => {
      window.clearTimeout(hideMenuTimeout);
      menuIsOpen = true;
      mobileMenu.hidden = false;
      mobileMenu.inert = false;
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Закрыть меню');
      document.body.classList.add('menu-open');
      menuFrame = window.requestAnimationFrame(() => {
        if (!menuIsOpen) return;
        mobileMenu.classList.add('is-open');
        const firstLink = $('a[href]', mobileMenu);
        if (firstLink) firstLink.focus({ preventScroll: true });
      });
    };

    mobileMenu.inert = true;
    menuToggle.addEventListener('click', () => (menuIsOpen ? closeMenu(true) : openMenu()));
    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a[href], [data-menu-close]')) closeMenu();
    });
    document.addEventListener('click', (event) => {
      if (menuIsOpen && !mobileMenu.contains(event.target) && !menuToggle.contains(event.target))
        closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (!menuIsOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      } else if (event.key === 'Tab') {
        const focusables = menuFocusables();
        const first = focusables[0];
        const last = focusables.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (event) => {
      if (event.matches) closeMenu(false, true);
    });
  }

  const navigationLinks = $$('[data-nav-link]');
  const navigationSections = ['services', 'works', 'studio', 'pricing', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (navigationLinks.length && navigationSections.length && 'IntersectionObserver' in window) {
    const visibleSections = new Set();
    const updateNavigation = () => {
      const activeSection = navigationSections.find((section) => visibleSections.has(section.id));
      navigationLinks.forEach((link) => {
        const isActive = Boolean(activeSection && link.hash === `#${activeSection.id}`);
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    const navigationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.add(entry.target.id);
          else visibleSections.delete(entry.target.id);
        });
        updateNavigation();
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: 0 }
    );
    navigationSections.forEach((section) => navigationObserver.observe(section));
  }

  const faqTriggers = $$('.faq-trigger');
  const setFaqState = (trigger, expanded) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.closest('.faq-item')?.classList.toggle('is-open', expanded);
    if (panel) {
      panel.hidden = false;
      panel.inert = !expanded;
      panel.setAttribute('aria-hidden', String(!expanded));
    }
  };
  faqTriggers.forEach((trigger, index) => {
    setFaqState(trigger, trigger.getAttribute('aria-expanded') === 'true');
    trigger.addEventListener('click', () => {
      const shouldOpen = trigger.getAttribute('aria-expanded') !== 'true';
      faqTriggers.forEach((other) => setFaqState(other, other === trigger && shouldOpen));
    });
    trigger.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowDown') nextIndex = (index + 1) % faqTriggers.length;
      if (event.key === 'ArrowUp')
        nextIndex = (index - 1 + faqTriggers.length) % faqTriggers.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = faqTriggers.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      faqTriggers[nextIndex].focus();
    });
  });

  const form = $('#contact-form');
  const serviceField = $('#service');
  const formStatus = $('#form-status');
  const formFields = ['name', 'email', 'service', 'message']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const submitButton = form ? $('button[type="submit"]', form) : null;
  const submitLabel = submitButton ? $('[data-submit-label]', submitButton) || submitButton : null;
  const originalSubmitText = submitLabel?.textContent;
  const touchedFields = new Set();

  const errorFor = (field) => {
    const value = field.value.trim();
    switch (field.id) {
      case 'name':
        if (!value) return 'Представься, пожалуйста.';
        if (value.length < 2) return 'Имя должно содержать хотя бы 2 символа.';
        if (value.length > 80) return 'Сократи имя до 80 символов.';
        return '';
      case 'email':
        if (!value) return 'Укажи email для связи.';
        if (
          value.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
          field.validity.typeMismatch
        ) {
          return 'Проверь адрес. Например: artist@example.com.';
        }
        return '';
      case 'service':
        return value &&
          [...field.options].some((option) => option.value === value && !option.disabled)
          ? ''
          : 'Выбери услугу, которая тебе интересна.';
      case 'message':
        if (!value) return 'Расскажи немного о своей музыкальной идее.';
        if (value.length < 10) return 'Добавь чуть больше деталей — хотя бы 10 символов.';
        if (value.length > 2000) return 'Сократи сообщение до 2 000 символов.';
        return '';
      default:
        return '';
    }
  };

  const validateField = (field) => {
    const error = errorFor(field);
    const errorElement = document.getElementById(`${field.id}-error`);
    if (errorElement) errorElement.textContent = error;
    field.setAttribute('aria-invalid', String(Boolean(error)));
    field.closest('.form-field')?.classList.toggle('has-error', Boolean(error));
    return !error;
  };

  const resetFormStatus = () => {
    if (formStatus) {
      formStatus.textContent = '';
      formStatus.classList.remove('is-success', 'is-error');
    }
    if (submitLabel) submitLabel.textContent = originalSubmitText;
    submitButton?.classList.remove('is-success');
  };

  if (form) {
    formFields.forEach((field) => {
      field.addEventListener('blur', () => {
        touchedFields.add(field.id);
        validateField(field);
      });
      const onEdit = () => {
        resetFormStatus();
        if (touchedFields.has(field.id)) validateField(field);
      };
      field.addEventListener('input', onEdit);
      if (field.tagName === 'SELECT') field.addEventListener('change', onEdit);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      resetFormStatus();
      const invalidFields = formFields.filter((field) => {
        touchedFields.add(field.id);
        return !validateField(field);
      });
      if (invalidFields.length) {
        if (formStatus) {
          formStatus.textContent = 'Проверь отмеченные поля — осталось несколько деталей.';
          formStatus.classList.add('is-error');
        }
        invalidFields[0].focus();
        return;
      }
      if (formStatus) {
        formStatus.textContent = 'Заявка успешно отправлена!';
        formStatus.classList.add('is-success');
        formStatus.tabIndex = -1;
        formStatus.focus({ preventScroll: true });
      }
      if (submitLabel) submitLabel.textContent = 'Всё готово';
      submitButton?.classList.add('is-success');
    });

    if (submitButton) submitButton.disabled = false;
  }

  $$('[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!serviceField) return;
      const value = link.dataset.service;
      if (![...serviceField.options].some((option) => option.value === value)) return;
      serviceField.value = value;
      resetFormStatus();
      if (touchedFields.has('service')) validateField(serviceField);
    });
  });

  const setupDialog = (dialog, closeButton) => {
    if (!dialog || typeof dialog.showModal !== 'function') return null;
    let opener;
    const close = () => dialog.close();
    closeButton?.addEventListener('click', close);
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      opener?.focus({ preventScroll: true });
    });
    return (trigger) => {
      opener = trigger;
      dialog.showModal();
      document.body.classList.add('dialog-open');
      closeButton?.focus({ preventScroll: true });
    };
  };

  const projects = [
    {
      title: 'MÉRA — Между строк',
      genre: 'INDIE POP / КОНЦЕПТ 01',
      description:
        'Камерный инди-поп о том, что остаётся между словами. В центре концепции — близкий, почти разговорный вокал, тёплые клавиши и ритм, который постепенно раскрывает историю.',
      scope: 'Музыкальный продакшен · Сведение · Мастеринг',
      art: 'assets/images/cover-mera.svg',
    },
    {
      title: 'QUIET FORM — Afterlight',
      genre: 'ELECTRONIC / КОНЦЕПТ 02',
      description:
        'Воображаемый электронный релиз на границе ночного города и утренней тишины. Упругий бас, короткие синтезаторные фразы и воздушные текстуры складываются в сдержанное, объёмное звучание.',
      scope: 'Сведение · Мастеринг',
      art: 'assets/images/cover-quiet-form.svg',
    },
    {
      title: 'ПОЛЮС — Тёплый воздух',
      genre: 'ALTERNATIVE / КОНЦЕПТ 03',
      description:
        'Визуальная история альтернативного трека с живыми гитарами и открытой динамикой. Идея проекта — сохранить ощущение совместного исполнения и дать каждому инструменту собственное пространство.',
      scope: 'Запись инструментов · Музыкальный продакшен · Сведение',
      art: 'assets/images/cover-polyus.svg',
    },
  ];
  const projectDialog = $('#project-dialog');
  const openProject = setupDialog(projectDialog, $('#project-close'));
  if (openProject) {
    $$('[data-project]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const project = projects[Number(trigger.dataset.project)];
        if (!project) return;
        const textFields = {
          '#project-title': project.title,
          '#project-genre': project.genre,
          '#project-description': project.description,
          '#project-scope': project.scope,
        };
        Object.entries(textFields).forEach(([selector, value]) => {
          const element = $(selector, projectDialog);
          if (element) element.textContent = value;
        });
        const art = $('#project-art', projectDialog);
        if (art) {
          art.src = project.art;
          art.alt = `Авторская обложка концепта «${project.title}»`;
        }
        openProject(trigger);
      });
    });
  }

  const galleryDialog = $('#gallery-dialog');
  const openGallery = setupDialog(galleryDialog, $('#gallery-close'));
  const galleryItems = $$('[data-gallery]');
  if (openGallery && galleryItems.length) {
    let galleryIndex = 0;
    const showGalleryImage = (index) => {
      galleryIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[galleryIndex];
      const thumbnail = $('img', item);
      const galleryImage = $('#gallery-image', galleryDialog);
      const caption = $('#gallery-caption', galleryDialog);
      if (thumbnail && galleryImage) {
        galleryImage.src = thumbnail.dataset.fullSrc || thumbnail.src;
        galleryImage.alt = thumbnail.alt;
      }
      if (caption)
        caption.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(
          galleryItems.length
        ).padStart(2, '0')} — ${item.dataset.caption || thumbnail?.alt || 'Пространство студии'}`;
    };
    galleryItems.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        showGalleryImage(index);
        openGallery(trigger);
      });
    });
    $('#gallery-prev')?.addEventListener('click', () => showGalleryImage(galleryIndex - 1));
    $('#gallery-next')?.addEventListener('click', () => showGalleryImage(galleryIndex + 1));
    galleryDialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showGalleryImage(galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
  }

  $$('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
