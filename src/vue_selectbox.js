define(['lodash', 'jquery'], function(_, $) {
    "use strict";

    return {
        template: "[[vue_selectbox.html]]",
        props: ['candidates', 'name', 'placeholder', 'model', 'label', 'multiple'],
        data: function() {
            return {
                is_open: false,
                current: false,
                value: [],
                input: ""
            };
        },
        computed: {
            filtered_candidates: function() {
                var self = this,
                    valid = _.filter(self.candidates, function(item) {
                        return !_.includes(self.value, item);
                    });

                if (self.input) {
                    return _.filter(valid, function(item) {
                        var label = self.pretty(item);
                        return label.toLowerCase().match(new RegExp(self.input.toLowerCase()));
                    });
                } else {
                    return valid;
                }
            },
            has_value: function() {
                return !_.isEmpty(this.value);
            },
            is_multiple: function() {
                return !!this.multiple;
            },
            safe_placeholder: function() {
                return this.placeholder || "Suche...";
            }
        },
        created: function() {
            var self = this;
            $(document)
            .on('click close_selectboxes', function(e) {
                if (!$(self.$el).has(e.target).length) {
                    self.close();
                }
            });
        },
        watch: {
            model: {
                handler: function(model) {
                    if (this.is_multiple) {
                        this.value = model ? _.clone(model) : [];
                    } else {
                        this.value = model ? [model] : null;
                    }
                },
                immediate: true
            }
        },
        methods: {
            activate: function($event) {
                var self = this;

                $(document).trigger('close_selectboxes');
                if (!$event || ($event.keyCode !== 13 && $event.keyCode !== 27)) {
                    this.is_open = true;
                    window.setTimeout(function() { $(self.$el).find('input').focus(); });
                    return false;
                }
            },
            close: function() {
                this.is_open = false;
                this.current = false;
                this.input = null;
            },
            /**
             * Highlights the value with the specified index.
             */
            set_current: function(index) {
                var num = this.filtered_candidates.length;
                this.current = (index + num) % num;
                if (num > 1) {
                    this.check_scroll();
                }
            },
            check_scroll: function() {
                var $candidates = $(this.$el).find('.candidates ul'),
                    $current = $candidates.children().eq(this.current),
                    height = $candidates.outerHeight(),
                    min = $candidates.scrollTop(),
                    max = min + height,
                    current_min = min + $current.position().top,
                    current_max = current_min + $current.outerHeight();

                if (current_max > max) {
                    $candidates.scrollTop(current_max - height);
                } else if (current_min < min) {
                    $candidates.scrollTop(current_min);
                }
            },
            next: function() {
                this.set_current(this.current === false ? 0 : this.current + 1);
            },
            prev: function() {
                this.set_current(this.current === false ? -1 : this.current - 1);
            },
            /**
             * Selects the currently highlighted value.
             */
            select: function() {
                if (this.current !== false) {
                    this.set_value(this.filtered_candidates[this.current]);
                }
                if (!this.is_multiple) {
                    this.close();
                }
            },
            /**
             * Updates the value and emits event.
             */
            set_value: function(value) {
                this.input = "";
                if (this.is_multiple) {
                    this.value.push(value);
                    this.$emit('update', this.value);
                } else {
                    this.value = value ? [value] : null;
                    this.$emit('update', value);
                }
            },
            unset_value: function(value) {
                if (this.is_multiple) {
                    this.value = _.without(this.value, value);
                    this.$emit('update', this.value);
                } else {
                    this.value = null;
                    this.$emit('update', this.value);
                }
                this.close();
            },
            pretty: function(item) {
                return this.label ? _.get(item, this.label) : item;
            }
        }
    };
});