var seafile_file_icon = {
        FILEEXT_ICON_MAP: {
            // text file
            'md': 'txt.png',
            'txt': 'txt.png',

            // pdf file
            'pdf' : 'pdf.png',
            // document file
            'doc' : 'word.png',
            'docx' : 'word.png',
            'ppt' : 'ppt.png',
            'pptx' : 'ppt.png',
            'xls' : 'excel.png',
            'xlsx' : 'excel.png',
            'odt' : 'word.png',
            'fodt' : 'word.png',
            'ods' : 'excel.png',
            'fods' : 'excel.png',
            'odp' : 'ppt.png',
            'fodp' : 'ppt.png',
            // music file

            'mp3' : 'music.png',
            'oga' : 'music.png',
            'ogg' : 'music.png',
            'flac' : 'music.png',
            'aac' : 'music.png',
            'ac3' : 'music.png',
            'wma' : 'music.png',
            // image file
            'jpg' : 'pic.png',
            'jpeg' : 'pic.png',
            'png' : 'pic.png',
            'svg' : 'pic.png',
            'gif' : 'pic.png',
            'bmp' : 'pic.png',
            'ico' : 'pic.png',
            // default
            'default' : 'file.png'
        },

        getFileIconUrl: function(filename) {
            var file_ext;
            var url_base = '/service/zimlet/com_zimbra_seafile/';
            if (filename.lastIndexOf('.') == -1) {
                return url_base + "file_icon/" + this.FILEEXT_ICON_MAP['default'];
            } else {
                file_ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            }

            if (this.FILEEXT_ICON_MAP[file_ext]) {
                return url_base + "file_icon/" + this.FILEEXT_ICON_MAP[file_ext];
            } else {
                return url_base + "file_icon/" + this.FILEEXT_ICON_MAP['default'];
            }
        }
};
