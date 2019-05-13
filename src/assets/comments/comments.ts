declare var $: any;

let is = (element, type) => element.$instanceOf(type);

/** THIS CLASS IS A MODIFIED VERSION OF bpmn-js-embedded-comments v0.5.0 (https://github.com/bpmn-io/bpmn-js-embedded-comments) MODULE - SEE THE LICENSE FILE FOR MORE LICENSE INFORMATION*/
export class Comments {

  constructor(overlays, eventBus) {
    this.overlays = overlays;
    this.eventBus = eventBus;
    this.init();
  }

  private overlays;
  private eventBus;

  private OVERLAY_HTML =
  '<div class="comments-overlay">' +
    '<div class="toggle">' +
      '<span class="icon-comment"></span>' +
      '<span class="comment-count" data-comment-count></span>' +
    '</div>' +
    '<div class="content">' +
      '<div class="comments"></div>' +
      '<div class="edit">' +
        '<textarea tabindex="1" placeholder="Add a comment"></textarea>' +
      '</div>' +
    '</div>' +
  '</div>';

  private COMMENT_HTML =
  '<div class="comment">' +
    '<div data-text /><a href class="delete icon-delete" data-delete></a>' +
  '</div>';

  init() {

    let self = this;

    self.eventBus.on('shape.added', (event) => {
      let element = event.element;

      if (element.labelTarget || !element.businessObject.$instanceOf('bpmn:FlowNode')) {
        return;
      }

      self.createCommentBox(element);

    });

    $(window).mouseup((e) => {
      let container = $('.comments-overlay');
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        self.collapseAll();
      }
    });

    $(document).on('click', '.delete', (e) => {
      $(document).find('.edit textarea').val('');
    });

  }

  createCommentBox(element) {

    let self = this;

    let $overlay = $(self.OVERLAY_HTML);

    $overlay.find('.toggle').click((e) => {
      self.toggleCollapse(element);
    });

    let $commentCount = $overlay.find('[data-comment-count]'),
        $content = $overlay.find('.content'),
        $textarea = $overlay.find('textarea'),
        $comments = $overlay.find('.comments');


    $textarea.on('keydown', (e) => {
      if (e.which === 13 && !e.shiftKey) {
        e.preventDefault();

        let comment = $textarea.val();

        if (comment) {
          self.addComment(element, '', comment);
          $textarea.val('');
          self.renderComments(element, $comments, $textarea, $overlay, $commentCount);
        }
      }
    });


    // attach an overlay to a node
    self.overlays.add(element, 'comments', {
      position: {
        bottom: 10,
        right: 10
      },
      html: $overlay
    });

    self.renderComments(element, $comments, $textarea, $overlay, $commentCount);
  }

  renderComments(element, $comments, $textarea, $overlay, $commentCount) {

    let self = this;

      // clear innerHTML
      $comments.html('');

      let comments = self.getComments(element);

      comments.forEach((val) => {
        let $comment = $(self.COMMENT_HTML);

        $comment.find('[data-text]').text(val[1]);
        $comment.find('[data-delete]').click((e) => {

          e.preventDefault();

          self.removeComment(element, val);
          self.renderComments(element, $comments, $textarea, $overlay, $commentCount);
          $textarea.val(val[1]);
        });

        $comments.append($comment);
      });

      $overlay[comments.length ? 'addClass' : 'removeClass']('with-comments');

      $commentCount.text(comments.length ? ('(' + comments.length + ')') : '');

      self.eventBus.fire('comments.updated', { comments: comments });
  }

  toggleCollapse(element) {

    let self = this;

    let o = self.overlays.get({ element: element, type: 'comments' })[0];

    let $overlay = o && o.html;

    if ($overlay) {

      let expanded = $overlay.is('.expanded');

      self.eventBus.fire('comments.toggle', { element: element, active: !expanded });

      if (expanded) {
        $overlay.removeClass('expanded');
      } else {
        $overlay.addClass('expanded');
        $overlay.find('textarea').focus();
      }
    }
  }

  collapseAll() {

    let self = this;

    self.overlays.get({ type: 'comments' }).forEach((c) => {
      let html = c.html;
      if (html.is('.expanded')) {
        self.toggleCollapse(c.element);
      }
    });

  }

  _getCommentsElement(element, create) {

    let bo = element.businessObject;
    let docs = bo.get('documentation');
    let comments;

    // get comments node
    docs.some(function(d) {
      return d.textFormat === 'text/x-comments' && (comments = d);
    });

    // create if not existing
    if (!comments && create) {
      comments = bo.$model.create('bpmn:Documentation', { textFormat: 'text/x-comments' });
      docs.push(comments);
    }

    return comments;
  }

  getComments(element) {
    let doc = this._getCommentsElement(element, null);

    if (!doc || !doc.text) {
      return [];
    } else {
      return doc.text.split(/;\r?\n;/).map(function(str) {
        return str.split(/:/, 2);
      });
    }
  }

  setComments(element, comments) {
    let doc = this._getCommentsElement(element, true);
    let str = comments.map(function(c) {
      return c.join(':');
    }).join(';\n;');

    doc.text = str;
  }

  addComment(element, author, str) {
    let comments = this.getComments(element);
    comments.push([ author, str ]);
    this.setComments(element, comments);
  }

  removeComment(element, comment) {
    let comments = this.getComments(element);
    let idx = -1;

    comments.some(function(c, i) {

      let matches = c[0] === comment[0] && c[1] === comment[1];

      if (matches) {
        idx = i;
      }

      return matches;
    });

    if (idx !== -1) {
      comments.splice(idx, 1);
    }

    this.setComments(element, comments);
  }

}

