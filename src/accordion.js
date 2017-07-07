import * as KEYS from './key-codes';

const TAB_ID = 'ae_accordion-heading';
const PANEL_ID = 'ae_accordion-panel';

// unique id for each tab/tabpanel pair
let uid = 1;

/**
 * Implements an accessible accordion menu with proper state and focus support.
 * @see https://www.w3.org/TR/wai-aria-practices-1.1/#accordion
 *
 * @param {HTMLElement} element - Container element of the accordion.
 * @param {ShadowRoot} [shadowRoot=element] - Shadow root element if using a custom element with shadow root. Defaults to the container element.
 *
 * For this to work, each accordion heading must be given the role="tab" and each
 * accordion menu must be given the role="tabpanel". From this, the code will
 * assume that sibling tab + tabpanel elements are related, so ensure each tab's
 * panel follows it without another tab in between.
 *
 * Optional attributes on container element
 *
 *    expanded - defaults all accordions to be expanded
 *    multiple - multiple menus can be expanded
 *    wrap-focus - wraps the accordion roving tabindex when on the first/last heading
 *
 * Events will pass the target element as the detail property of the event
 *
 *    accordion-expanded - fired when an accordion panel is expanded
 *    accordion-collapsed - fired when an accordion panel is collapsed
 *    accordion-focused - fired when an accordion heading is focused
 *    accordion-blurred - fired when an accordion heading is blurred
 *
 * Example
 *
 *  <div>
 *
 *    <h3 role="tab">Heading 1</h3>
 *    <div role="tabpanel">Lorium ipsum dolores.</div>
 *
 *    <h3 role="tab">Heading 2</h3>
 *    <div role="tabpanel">Lorium ipsum dolores.</div>
 *
 *  </div>
 *
 * Will be upgraded to
 *
 *  <div role="tablist" aria-multiselectable="true">
 *
 *    <h3 id="ae_accordion-heading1" role="tab" aria-expanded="true" aria-selected="true" aria-controls="ae_accordion-panel1" tabindex="0">Heading 1</h3>
 *    <div id="ae_accordion-panel1" role="tabpanel" aria-labelledby="ae_accordion-heading1" aria-hidden="false">
 *      Lorium ipsum dolores.
 *    </div>
 *
 *    <h3 id="ae_accordion-heading2" role="tab" aria-expanded="false" aria-selected="false" aria-controls="ae_accordion-panel2" tabindex="-1">Heading 2</h3>
 *    <div id="ae_accordion-panel2" role="tabpanel" aria-labelledby="ae_accordion-heading2" aria-hidden="true">
 *      Lorium ipsum dolores.
 *    </div>
 *
 *  </div>
 */
function accordion(element, shadowRoot) {
  // ensure we are a DOM element and have proper element functions
  if (!element instanceof HTMLElement) return;

  // if no shadowRoot is passed default to the container element
  // using toString() is the only safe way to check for a shadow root node when
  // the polyfill is not loaded
  var root = (shadowRoot && shadowRoot.toString() === '[object ShadowRoot]' ? shadowRoot : element);

  // states
  let currentTabIndex = 0;
  let currentTab, lastTabIndex;

  // options
  const OPTIONS = {
    expanded: element.hasAttribute('expanded'),
    multiple: element.hasAttribute('multiple'),
    wrapFocus: element.hasAttribute('wrap-focus')
  };

  // add role and state for the parent
  element.setAttribute('aria-multiselectable', OPTIONS.multiple);
  element.setAttribute('role', 'tablist');

  // set role and state for each tab
  let tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  for (let i = 0, tab; (tab = tabs[i]); i++) {
    tab.setAttribute('aria-controls', PANEL_ID + (uid + i));
    tab.setAttribute('aria-expanded', (OPTIONS.expanded ? true : false));
    tab.setAttribute('aria-selected', (i === 0 ? true : false));
    tab.setAttribute('id', TAB_ID + (uid + i));
    tab.setAttribute('tabindex', (i === 0 ? 0 : -1));
  }

  // set role and state for each tabpanel
  let panels = root.querySelectorAll('[role="tabpanel"]');
  for (let i = 0, panel; (panel = panels[i]); i++) {
    panel.setAttribute('aria-hidden', (OPTIONS.expanded ? false : true));
    panel.setAttribute('aria-labelledby', TAB_ID + (uid + i));
    panel.setAttribute('id', PANEL_ID + (uid + i));
  }

  uid += tabs.length;
  currentTab = tabs[0];
  lastTabIndex = tabs.length - 1;

  // keyboard events
  root.addEventListener('keydown', e => {

    // all accordion keyboard interaction can only happen when a heading is selected
    if (e.target.getAttribute('role') === 'tab') {
      switch (e.which) {

        // left/up arrow - move focus to previous heading
        case KEYS.left:
        case KEYS.up:
          e.preventDefault();

          // optionally wrap focus
          if (OPTIONS.wrapFocus) {
            currentTabIndex = (currentTabIndex === 0 ? lastTabIndex : currentTabIndex - 1);
          }
          else {
            currentTabIndex = (currentTabIndex === 0 ? 0 : currentTabIndex - 1);
          }

          updateFocusState();
          break;

        // right/down arrow - move focus to next heading
        case KEYS.right:
        case KEYS.down:
          e.preventDefault();

          // optionally wrap focus
          if (OPTIONS.wrapFocus) {
            currentTabIndex = (currentTabIndex === lastTabIndex ? 0 : currentTabIndex + 1);
          }
          else {
            currentTabIndex = (currentTabIndex === lastTabIndex ? lastTabIndex : currentTabIndex + 1);
          }

          updateFocusState();
          break;

        // end - move focus to last heading
        case KEYS.end:
          e.preventDefault();
          currentTabIndex = lastTabIndex;
          updateFocusState();

          break;

        // home - move focus to first heading
        case KEYS.home:
          currentTabIndex = 0;
          updateFocusState();
          break;

        // enter/space - toggle accordion expansion
        case KEYS.enter:
        case KEYS.space:
          e.preventDefault();
          toggleTabPanel(currentTab);
          break;
      }
    }

  }, true);

  // mouse events
  root.addEventListener('mousedown', e => {

    // update the currently focused item and toggle the panel when heading is selected
    if (e.target.getAttribute('role') === 'tab') {
      currentTabIndex = tabs.indexOf(e.target);

      updateFocusState();
      toggleTabPanel(currentTab);
    }

  }, true);

  /**
   * Update the state of the currently selected tab.
   */
  function updateFocusState() {
    let event;

    // update states and roving tab index
    currentTab.setAttribute('aria-selected', false);
    currentTab.setAttribute('tabindex', -1);

    event = new CustomEvent('accordion-blurred', {bubbles: true, detail: currentTab});
    root.dispatchEvent(event);

    currentTab = tabs[currentTabIndex];
    currentTab.setAttribute('aria-selected', true);
    currentTab.setAttribute('tabindex', 0);
    currentTab.focus();

    event = new CustomEvent('accordion-focused', {bubbles: true, detail: currentTab});
    root.dispatchEvent(event);
  }

  /**
   * Open or close the currently selected tab panel.
   */
  function toggleTabPanel(tab) {
    let panel = root.querySelector('#' + tab.getAttribute('aria-controls'));
    let event;

    // open panel
    if (tab.getAttribute('aria-expanded') === 'false') {

      // close other open tab before opening this one
      if (!OPTIONS.multiple && root.querySelector('[aria-expanded="true"]')) {
        let openPanel = root.querySelector('[aria-expanded="true"]');
        toggleTabPanel(openPanel);
      }

      tab.setAttribute('aria-expanded', true);
      panel.setAttribute('aria-hidden', false);

      event = new CustomEvent('accordion-expanded', {bubbles: true, detail: tab});
    }
    // close panel
    else {
      tab.setAttribute('aria-expanded', false);
      panel.setAttribute('aria-hidden', true);

      event = new CustomEvent('accordion-collapsed', {bubbles: true, detail: tab});
    }

    root.dispatchEvent(event);
  }

}

export {accordion};