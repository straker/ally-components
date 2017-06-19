(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : factory(global.a11yEnhancer = global.a11yEnhancer || {});
})(this, function (exports) {
  'use strict';

  /**
   * CustomEvent polyfill.
   */

  var CustomEvent = function () {
    if (typeof window.CustomEvent === "function") return window.CustomEvent;

    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    return CustomEvent;
  }();

  /**
   * Define commonly used keycodes for interacting with components.
   */

  var esc = 27;

  var TITLE_ID = 'ae_dialog-heading';

  // unique id for each dialog heading
  var uid = 1;

  /**
   * Implements an accessible accordion menu with proper state and focus support.
   * @see https://www.w3.org/TR/wai-aria-practices/#dialog_modal
   *
   * @param {HTMLElement} element - Container element of the accordion.
   * @param {ShadowRoot} [shadfowRoot=element] - Shadow root element if using a custom element with shadow root. Defaults to the container element.
   *
   * For this to work, the modal must be given the role="dialog". The element will be moved
   * to be a direct child of body. This ensures there are no z-index problems and that the
   * modal can trap keyboard focus easily by adding the inert attribute to all it's siblings.
   *
   * This implementation also requires the inert polyfill (npm install --save wicg-inert).
   *
   * By default, the modal is of type modal. This means that keyboard interactions are trapped
   * to the modal when it is opened and the rest of the page cannot be interacted with.
   *
   * Optional attributes on container element
   *
   *    modeless - A modeless dialog
   *    no-esc - Don't close the modal on escape key
   *
   * Events will pass the target element as the detail property of the event
   *
   *    modal-opened - fired when the modal is opened
   *    modal-closed - fired when the modal is closed
   */
  function dialog(element, shadowRoot) {
    // ensure we are a DOM element and have proper element functions
    if (!element instanceof HTMLElement) return;

    // if no shadowRoot is passed default to the container element
    // using toString() is the only safe way to check for a shadow root node when
    // the polyfill is not loaded
    var root = shadowRoot && shadowRoot.toString() === '[object ShadowRoot]' ? shadowRoot : element;

    // states
    var previousActiveElement = void 0;

    // options
    var OPTIONS = {
      modeless: element.hasAttribute('modeless')
    };

    // the role could be on the element or one of it's children
    var dialog = element.getAttribute('role') === 'dialog' ? element : root.querySelector('[role="dialog"]');

    // allow the dialog to be focusable when opened
    // @see https://github.com/whatwg/html/issues/1929
    dialog.setAttribute('tabindex', -1);
    dialog.style.outline = 'none';

    // move the dialog to be a direct child of body if it's not already. this both resolves any
    // z-index problems and makes disabling the rest of the page easier (just query selector
    // everything under body except the dialog)
    if (root.parentElement !== document.body) {
      document.body.appendChild(root);
    }

    // find the first heading and make it the label to the dialog
    var title = dialog.querySelector('h1,h2,h3,h4,h5,h6');
    if (!title.hasAttribute('id')) {
      title.setAttribute('id', TITLE_ID + uid++);
    }

    // only set the label if it's not already set
    if (!dialog.hasAttribute('aria-labelledby')) {
      dialog.setAttribute('aria-labelledby', title.getAttribute('id'));
    }

    // give the dialog an open and close method that can be called externally
    /**
     * Open the dialog.
     */
    dialog.open = function () {
      if (this.hasAttribute('open')) return;

      previousActiveElement = document.activeElement;

      if (!OPTIONS.modeless) {

        // prevent page from scrolling while open
        document.body.style.overflow = 'hidden';

        // make all siblings of the dialog inert if it's a modal
        Array.from(document.body.children).forEach(function (child) {
          if (child !== root) {
            child.inert = true;
          }
        });
      }

      this.setAttribute('open', '');

      // event listeners
      document.addEventListener('click', checkCloseDialog);
      document.addEventListener('keydown', checkCloseDialog);

      // focus the dialog if no element has autofocus attribute
      if (!dialog.querySelector('[autofocus]')) {
        this.focus();
      } else {
        dialog.querySelector('[autofocus]').focus();
      }

      root.dispatchEvent(new CustomEvent('modal-opened', { detail: this }));
    };

    /**
     * Close the dialog.
     */
    dialog.close = function () {
      if (!this.hasAttribute('open')) return;

      if (!OPTIONS.modeless) {
        document.body.style.overflow = null;

        // uninert all siblings
        Array.from(document.body.children).forEach(function (child) {
          if (child !== root) {
            child.inert = false;
          }
        });
      }

      this.removeAttribute('open');

      // remove event listeners
      document.removeEventListener('click', checkCloseDialog);
      document.removeEventListener('keydown', checkCloseDialog);

      // focus the previous element
      previousActiveElement.focus();
      previousActiveElement = null;

      root.dispatchEvent(new CustomEvent('modal-closed', { detail: this }));
    };

    /**
     * Check for events that should close the dialog.
     * @param {Event} e
     */
    function checkCloseDialog(e) {

      // check for escape on keydown
      if (e.type === 'keydown' && e.which === esc) {
        dialog.close();
      }

      // check if click happened outside of dialog
      else {
          var el = e.target;

          while (el.parentElement) {
            if (el === dialog) {
              break;
            }

            el = el.parentElement;
          }

          // close the dialog if the click happened outside of it
          if (el !== dialog) {
            dialog.close();
          }
        }
    }
  }

  exports.dialog = dialog;

  Object.defineProperty(exports, '__esModule', { value: true });
});