import { moment } from 'meteor/momentjs:moment';
import { filesize } from 'meteor/mrt:filesize';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import { _app, Collections } from '/imports/lib/core.js';

import '/imports/client/upload/upload-form.jade';

const formError    = new ReactiveVar(false);
const showSettings = new ReactiveVar(false);

Template.uploadForm.onCreated(function() {
  this.uploadQTY = 0;

  this.initiateUpload = (event, files) => {
    if (_app.uploads.get()) {
      return false;
    }
    if (!files.length) {
      formError.set('Please select a file to upload');
      return false;
    }
    if (files.length > 6) {
      formError.set('Please select up to 6 files');
      return false;
    }
    this.uploadQTY = files.length;
    const cleanUploaded = (current) => {
      const _uploads = _app.clone(_app.uploads.get());
      if (_app.isArray(_uploads)) {
        for (let i = 0; i < _uploads.length; i++) {
          if (_uploads[i].file.name === current.file.name) {
            _uploads.splice(i, 1);
            if (_uploads.length) {
              _app.uploads.set(_uploads);
            } else {
              this.uploadQTY = 0;
              _app.uploads.set(false);
            }
          }
        }
      }
    };

    const uploads = [];
    const createdAt = +new Date();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      Collections.files.insert({
        file: file,
        meta: {
          blamed: 0,
          expireAt: new Date(createdAt + _app.conf.fileTTL),
          createdAt
        },
        streams: 'dynamic',
        chunkSize: 'dynamic',
        transport: _app.conf.uploadTransport.get()
      }, false).on('end', function (error, fileObj) {
        if (!error) {
          const recentUploads = _app.conf.recentUploads.get();
          if (recentUploads.length >= 100) {
            recentUploads.shift();
          }

          recentUploads.push(fileObj);
          _app.conf.recentUploads.set(recentUploads);
          Collections._files.insert(fileObj);

          if (files.length === 1) {
            setTimeout(() => {
              FlowRouter.go('file', { _id: fileObj._id });
            }, 128);
          }
        }
        cleanUploaded(this);
      }).on('abort', function () {
        cleanUploaded(this);
      }).on('error', function (error) {
        console.error(error);
        formError.set((formError.get() ? formError.get() + '<br />' : '') + this.file.name + ': ' + (_app.isObject(error) ? error.reason : error));
        setTimeout( () => {
          formError.set(false);
        }, 15000);
        cleanUploaded(this);
      }).on('start', function() {
        uploads.push(this);
        _app.uploads.set(uploads);
      }).start();
    }
    return true;
  };
});

Template.uploadForm.helpers({
  error() {
    return formError.get();
  },
  uploads() {
    return _app.uploads.get();
  },
  status() {
    let i                = 0;
    const uploads        = _app.uploads.get();
    let progress         = 0;
    const uploadQTY      = Template.instance().uploadQTY;
    let estimateBitrate  = 0;
    let estimateDuration = 0;
    let onPause          = false;

    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        onPause = uploads[j].onPause.get();
        progress += uploads[j].progress.get();
        estimateBitrate += uploads[j].estimateSpeed.get();
        estimateDuration += uploads[j].estimateTime.get();
        i++;
      }

      if (i < uploadQTY) {
        progress += 100 * (uploadQTY - i);
      }

      progress         = Math.ceil(progress / uploadQTY);
      estimateBitrate  = filesize(Math.ceil(estimateBitrate / i), { bits: true }) + '/s';
      estimateDuration = (() => {
        const duration = moment.duration(Math.ceil(estimateDuration / i));
        let hours = '' + (duration.hours());
        if (hours.length <= 1) {
          hours = '0' + hours;
        }

        let minutes = '' + (duration.minutes());
        if (minutes.length <= 1) {
          minutes = '0' + minutes;
        }

        let seconds = '' + (duration.seconds());
        if (seconds.length <= 1) {
          seconds = '0' + seconds;
        }
        return hours + ':' + minutes + ':' + seconds;
      })();
    }

    return {
      progress: progress,
      estimateBitrate: estimateBitrate,
      estimateDuration: estimateDuration,
      onPause: onPause
    };
  },
  showSettings() {
    return showSettings.get();
  },
  showProjectInfo() {
    return _app.showProjectInfo.get();
  },
  uploadTransport() {
    return _app.conf.uploadTransport.get();
  }
});

Template.uploadForm.events({
  'click input[type="radio"]'(e) {
    _app.conf.uploadTransport.set(e.currentTarget.value);
    return true;
  },
  'click [data-pause-all]'(e) {
    e.preventDefault();
    const uploads = _app.uploads.get();
    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        uploads[j].pause();
      }
    }
    return false;
  },
  'click [data-abort-all]'(e) {
    e.preventDefault();
    const uploads = _app.uploads.get();
    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        uploads[j].abort();
      }
    }
    formError.set(false);
    return false;
  },
  'click [data-continue-all]'(e) {
    e.preventDefault();
    const uploads = _app.uploads.get();
    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        uploads[j].continue();
      }
    }
    return false;
  },
  'click #fakeUpload'(e, template) {
    if (!_app.isiOS) {
      e.preventDefault();
      template.$('#userfile').trigger('click');
      return false;
    }
    template.$('#userfile').trigger('click');
  },
  'dragover #uploadFile, dragenter #uploadFile'(e) {
    e.preventDefault();
    e.stopPropagation();
    _app.isFileOver.set(true);
    e.originalEvent.dataTransfer.dropEffect = 'copy';
  },
  'drop #uploadFile.file-over'(e, template) {
    e.preventDefault();
    e.stopPropagation();
    formError.set(false);
    _app.isFileOver.set(false);
    e.originalEvent.dataTransfer.dropEffect = 'copy';
    template.initiateUpload(e, e.originalEvent.dataTransfer.files, template);
    return false;
  },
  'change #userfile'(e, template) {
    template.$('form#uploadFile').submit();
  },
  'submit form#uploadFile'(e, template) {
    e.preventDefault();
    formError.set(false);
    template.initiateUpload(e, e.currentTarget.userfile.files);
    return false;
  },
  'click [data-show-settings]'(e) {
    e.preventDefault();
    showSettings.set(!showSettings.get());
    return false;
  },
  'click [data-show-project-info]'(e) {
    e.preventDefault();
    _app.showProjectInfo.set(!_app.showProjectInfo.get());
    return false;
  },
  'click [data-cancel-dnd]'(e) {
    e.preventDefault();
    _app.isFileOver.set(false);
    return false;
  }
});
