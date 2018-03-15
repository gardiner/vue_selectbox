define(['lodash', 'jquery'], function(_, $) {
    "use strict";

    return {
        template: "[[vue_selectbox.html]]",
        props: ['candidates', 'placeholder', 'model', 'label', 'multiple', 'add'],
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
                var self = this;

                if (self.input) {
                    return _.filter(self.candidates, function(item) {
                        var label = self.pretty(item);
                        return label.toLowerCase().match(new RegExp(self.input.toLowerCase()));
                    });
                } else {
                    return self.candidates;
                }
            },
            has_value: function() {
                return !_.isEmpty(this.value);
            },
            is_multiple: function() {
                return !!this.multiple;
            },
            is_add_visible: function() {
                return this.input && this.add;
            },
            safe_placeholder: function() {
                return this.placeholder || "Suche...";
            }
        },
        mounted: function() {
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
                $(document).trigger('close_selectboxes');
                if (!$event || ($event.keyCode !== 13 && $event.keyCode !== 27)) {
                    this.is_open = true;
                    this.focus();
                    return false;
                }
            },
            focus: function() {
                var self = this;

                window.setTimeout(function() { $(self.$el).find('input').focus(); });
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

                if (index === false || this.is_selected(this.get_by_index(index))) {
                    this.current === false;
                } else {
                    this.current = (index + num) % num;
                }
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
            get_by_index: function(index) {
                var num = this.filtered_candidates.length;
                return this.filtered_candidates[(index + num) % num];
            },
            find_next: function(direction) {
                var num = this.filtered_candidates.length,
                    next_index;

                if (this.current === false) {
                    next_index = (direction > 0) ? 0 : -1;
                } else {
                    next_index = this.current + direction;
                }

                //skip selected values, but limited tries to avoid endless loop
                while (this.is_selected(this.get_by_index(next_index)) && next_index < (2 * num) && next_index > (-2 * num)) {
                    next_index += direction;
                }

                return next_index;
            },
            next: function() {
                this.set_current(this.find_next(1));
            },
            prev: function() {
                this.set_current(this.find_next(-1));
            },
            /**
             * Selects the currently highlighted value.
             */
            select: function() {
                var selected;
                if (this.current !== false) {
                    selected = this.filtered_candidates[this.current];
                    if (!this.is_selected(selected)) {
                        this.set_value(selected);

                        if (!this.is_multiple) {
                            this.close();
                        } else {
                            this.focus();
                        }
                    }
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
                if (_.isEmpty(this.value)) {
                    this.close();
                } else {
                    this.focus();
                }
            },
            pretty: function(item) {
                return this.label ? _.get(item, this.label) : item;
            },
            is_selected: function(item) {
                return _.includes(this.value, item);
            },
            add_candidate: function() {
                if (this.input) {
                    this.$emit('add', this.input);
                    if (this.add == 'close') {
                        this.close();
                    }
                }
            }
        }
    };
});