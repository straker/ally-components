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
   * Tests if an element is visible on the screen.
   * @see http://stackoverflow.com/a/36737835/2124254
   * @param {HTMLElement} elm
   * @returns {boolean}
   */
  function isVisible(elm) {
    if (!elm.offsetHeight && !elm.offsetWidth || getComputedStyle(elm).visibility === 'hidden') {
      return false;
    }
    return true;
  }

  /**
   * Implements an accessible accordion menu with proper state and focus support.
   * @see https://www.w3.org/TR/wai-aria-practices/#dialog_modal
   *
   * @param {HTMLElement} element - Container element of the accordion.
   * @param {ShadowRoot} [shadfowRoot=element] - Shadow root element if using a custom element with shadow root. Defaults to the container element.
   *
   * Optional attributes on container element
   *
   *    modeless - a modeless dialog
   */
  function dialog(element, shadowRoot) {
    // ensure we are a DOM element and have proper element functions
    if (!element instanceof HTMLElement) return;

    // if no shadowRoot is passed default to the container element
    // using toString() is the only safe way to check for a shadow root node when
    // the polyfill is not loaded
    var root = shadowRoot && shadowRoot.toString() === '[object ShadowRoot]' ? shadowRoot : element;

    // options
    var OPTIONS = {
      modeless: element.hasAttribute('modeless')
    };

    // add role and state for the dialog
    var dialog = root.querySelector('[role="dialog"]') || element;
    dialog.setAttribute('aria-hidden', true);

    // allow the dialog to be focusable
    // @see https://github.com/whatwg/html/issues/1929
    dialog.setAttribute('tabindex', '-1');
    dialog.style.outline = 'none';
    dialog.type = OPTIONS.modeless ? 'modeless' : 'modal';

    // add an id to the title of the modal so the container can use it for
    // aria-labelledby
    var title = root.querySelector('h1, h2, h3, h4, h5, h6');
    if (title) {
      if (!title.hasAttribute('id')) {
        title.setAttribute('id', TITLE_ID + uid++);
      }

      dialog.setAttribute('aria-labelledby', title.getAttribute('id'));
    }

    /**
     * Public function to open the dialog.
     */
    dialog.show = function () {
      var _this = this;

      if (!this.hasAttribute('aria-hidden')) {
        return;
      }

      this.removeAttribute('aria-hidden');

      // save a reference to the element that opened this modal
      this._lastFocusedElement = document.activeElement;

      // focus the dialog element using tabindex=-1 and hide the focus styling instead of auto
      // focusing the first element. users can still use autofocus to focus an element instead
      // of the dialog.
      // @see https://github.com/whatwg/html/issues/1929

      // find the first visible autofocus element and focus it
      var autofocusEls = this.querySelectorAll('[autofocus]');
      var autofocusEl;
      for (var i = 0; i < autofocusEls.length; i++) {
        if (isVisible(autofocusEls[i])) {
          autofocusEl = autofocusEls[i];
          autofocusEl.focus();
          break;
        }
      }

      if (!autofocusEl) {
        dialog.focus();
      }

      if (this.type === 'modal') {

        // prevent the page from scrolling
        document.body.style.overflow = 'hidden';

        // focus must be held within the dialog until it is canceled or submitted.
        // pressing tab with focus on the last focusable item in the dialog will move focus
        // back to the first focusable item in the dialog
        // likewise, if the user is shift-tabbing through elements in the dialog, pressing
        // shift-tab with focus on the first focusable item in the dialog will move focus
        // to the last item in the dialog
        //
        // to do this, we'll make everything outside of the modal have a tabindex=-1
        // since we can't determine what in the modal is focusable and tabbable
        // @see https://github.com/whatwg/html/issues/2071
        //
        // run async so it doesn't interfere with any dialog open animation
        setTimeout(function () {
          var modalNodes = Array.from(_this.querySelectorAll('*'));

          // by only finding elements that do not have tabindex="-1" we ensure we don't
          // corrupt the previous state of the element if a modal was already open
          _this._nonModalNodes = document.querySelectorAll('body *:not([role="dialog"]):not([tabindex="-1"])');

          for (var i = 0; i < _this._nonModalNodes.length; i++) {
            var node = _this._nonModalNodes[i];

            if (!modalNodes.includes(node)) {

              // save the previous tabindex state so we can restore it on close
              node._prevTabindex = node.getAttribute('tabindex');
              node.setAttribute('tabindex', -1);

              // tabindex=-1 does not prevent the mouse from focusing the node (which
              // would show a focus outline around the element). prevent this by disabling
              // outline styles while the modal is open
              // @see https://www.sitepoint.com/when-do-elements-take-the-focus/
              node.style.outline = 'none';
            }
          }
        }, 0);
      }

      // add event listeners
      document.addEventListener('keydown', keydownHandler);
      document.addEventListener('mousedown', clickHandler, true);
    };

    /**
     * Public function to close the dialog.
     */
    dialog.close = function () {
      var _this2 = this;

      if (this.hasAttribute('aria-hidden')) {
        return;
      }

      this.setAttribute('aria-hidden', true);

      // restore tabindex to all nodes
      if (this.type === 'modal') {
        document.body.style.overflow = null;

        // restore or remove tabindex from nodes
        // run async so it doesn't interfere with the dialog close animation
        setTimeout(function () {
          for (var i = 0; i < _this2._nonModalNodes.length; i++) {
            var node = _this2._nonModalNodes[i];

            if (node._prevTabindex) {
              node.setAttribute('tabindex', node._prevTabindex);
              node._prevTabindex = null;
            } else {
              node.removeAttribute('tabindex');
            }

            node.style.outline = null;
          }
        }, 0);
      }

      // when the dialog is closed or canceled focus should return to the element
      // in the application which had focus before the dialog is invoked
      this._lastFocusedElement.focus();
      this._lastFocusedElement = null;

      // clean up event listeners
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('mousedown', clickHandler, true);
    };

    // keyboard events
    function keydownHandler(e) {

      // it is recommended that a dialog also be canceled by pressing the Escape
      // key with focus on any item
      if (e.which === esc) {
        root.dispatchEvent(new CustomEvent('dialog-closed'));
        dialog.close();
      }
    }

    function clickHandler(e) {

      if (dialog.type !== 'modal') {
        return;
      }

      // modals prevent interacting with the content of the page until closed
      var el = e.target;
      while (el.parentElement && el !== dialog) {
        el = el.parentElement;
      }

      if (el !== dialog) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  exports.dialog = dialog;

  Object.defineProperty(exports, '__esModule', { value: true });
});