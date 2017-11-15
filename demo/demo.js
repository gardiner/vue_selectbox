requirejs.config({
    paths: {
        "jquery": "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min",
        "vue": "https://cdnjs.cloudflare.com/ajax/libs/vue/2.5.3/vue.min",
        "lodash": "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.4/lodash.min",
        "vueSelectbox": "../dist/vue_selectbox"
    }
});


requirejs(["jquery", "vue", "vueSelectbox"], function($, Vue, vueSelectbox) {
    "use strict";

    new Vue({
        components: {
            selectbox: vueSelectbox
        },
        data: {
            current: null,
            current_multiple: null,
            candidates: [
                {name: 'Antarctica'},
                {name: 'Asia'},
                {name: 'Australia'},
                {name: 'Europe'},
                {name: 'North America'},
                {name: 'South America'}
            ]
        },
        methods: {
            select: function(value) {
                this.current = value;
            },
            select_multiple: function(value) {
                this.current_multiple = value;
            },
        },
    }).$mount("#demo");
});