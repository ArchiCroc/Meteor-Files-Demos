import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Collections } from '/imports/lib/core.js';

const meta404 = {
  robots: 'noindex, nofollow',
  title: '404: Page not found',
  keywords: {
    name: 'keywords',
    itemprop: 'keywords',
    content: '404, page, not found'
  },
  description: {
    name: 'description',
    itemprop: 'description',
    property: 'og:description',
    content: '404: No such page'
  },
  'twitter:description': '404: No such page',
  'og:image': {
    property: 'og:image',
    content: Meteor.absoluteUrl('icon_1200x630.png')
  },
  'twitter:image': {
    name: 'twitter:image',
    content: Meteor.absoluteUrl('icon_750x560.png')
  }
};

const promiseMethod = (name, args, sharedObj, key) => {
  return new Promise((resolve) => {
    Meteor.apply(name, args, (error, result) => {
      if (error) {
        console.error(`[promiseMethod] [${name}]`, error);
        sharedObj[key] = void 0;
      } else {
        sharedObj[key] = result || void 0;
      }
      resolve();
    });
  });
};

FlowRouter.route('/', {
  name: 'index',
  action() {
    this.render('_layout', 'index');
  }
});

FlowRouter.route('/:_id', {
  name: 'file',
  title(params, queryParams, file) {
    if (file) {
      return `Download file: ${file.get('name')}`;
    }
    return meta404.title;
  },
  meta(params, queryParams, _file) {
    if (_file) {
      const file = _file.get();
      return {
        robots: 'noindex, nofollow',
        keywords: {
          name: 'keywords',
          itemprop: 'keywords',
          content: `file, download, shared, ${file.name}, ${file.extension}, ${file.type}`
        },
        description: {
          name: 'description',
          itemprop: 'description',
          property: 'og:description',
          content: `Download shared file: ${file.name}`
        },
        'twitter:description': `Download shared file: ${file.name}`
      };
    }

    return meta404;
  },
  action(params) {
    this.render('_layout', 'file', { params });
  },
  waitOn(params) {
    if (!Collections.files.findOne(params._id)) {
      return promiseMethod('file.get', [params._id], this.conf, 'file');
    }
    return [];
  },
  whileWaiting() {
    this.render('_layout', '_loading');
  },
  onNoData() {
    this.render('_layout', '_404');
  },
  data(params) {
    const file = Collections.files.findOne(params._id);
    if (file) {
      return file;
    }

    if (this.conf.file) {
      Collections._files.insert(this.conf.file);
      return Collections.files.findOne(this.conf.file._id);
    }
    return void 0;
  }
});

FlowRouter.route('/:_id/preview', {
  name: 'filePreview',
  title(params, queryParams, file) {
    if (file) {
      return `View file: ${file.get('name')}`;
    }
    return meta404.title;
  },
  meta(params, queryParams, _file) {
    if (_file) {
      const file = _file.get();
      return {
        robots: 'noindex, nofollow',
        keywords: {
          name: 'keywords',
          itemprop: 'keywords',
          content: `file, view, preview, uploaded, shared, ${file.name}, ${file.extension}, ${file.type}`
        },
        description: {
          name: 'description',
          itemprop: 'description',
          property: 'og:description',
          content: `View uploaded and shared file: ${file.name}`
        },
        'twitter:description': `View uploaded and shared file: ${file.name}`
      };
    }

    return meta404;
  },
  action(params) {
    this.render('_layout', 'filePreview', { params });
  },
  waitOn(params) {
    if (!Collections.files.findOne(params._id)) {
      return promiseMethod('file.get', [params._id], this.conf, 'file');
    }
    return [];
  },
  whileWaiting() {
    this.render('_layout', '_loading');
  },
  onNoData() {
    this.render('_layout', '_404');
  },
  data(params) {
    const file = Collections.files.findOne(params._id);
    if (file) {
      return file;
    }

    if (this.conf.file) {
      Collections._files.insert(this.conf.file);
      return Collections.files.findOne(this.conf.file._id);
    }
    return void 0;
  }
});

// 404 route (catch all)
FlowRouter.route('*', {
  action() {
    this.render('_layout', '_404');
  },
  title: '404: Page not found',
  meta: meta404
});