define(['jquery'], function($) {
    "use strict";

    function array_clone(array) {
        return Array.prototype.slice.call(array);
    }

    function array_without(array, value) {
        var clone = array_clone(array);
        Array.prototype.splice.call(clone, clone.indexOf(value), 1);
        return clone;
    }

    return {
        template: "[[vue_selectbox.html]]",
        props: [
            'candidates',   //selectable items
            'placeholder',  //placeholder text
            'all_label',    //label/placeholder for "all items"
            'model',        //selected value
            'label',        //item property (string) or callback (function) for displaying and searching
            'multiple',     //whether multiple items can be selected
            'disabled',     //whether the select is active and can be used
            'options'       //configuration options, see this.config
        ],
        //allows use of v-model directive
        model: {
            'prop': 'model',
            'event': 'update'
        },
        data: function() {
            return {
                is_open: false,
                current: false,
                value: [],
                input: ""
            };
        },
        computed: {
            /**
             * Returns configuration as specified by options prop.
             */
            config: function() {
                var defaults = {
                        show_filter_input: true,            //show filter input to filter candidates
                        allow_adding: false,                //allows adding of new values. Triggers 'add' event
                        allow_deselect_from_list: false,    //allows deselecting items from the candidates list
                        close_after_select: !this.multiple, //closes the selectbox after selecting an item
                        close_after_add: !this.multiple,    //closes the selectbox after adding an item
                        close_after_deselect: true,         //closes the selectbox after deselecting the last item
                        add_on_select: true,                //adds a new value when pressing enter
                        allow_select_all: true,             //allows seleting all items with a single click
                        combine_all: false                  //if all available items are selected, show single value
                    },
                    key;
                for (key in this.options) {
                    if (Object.prototype.hasOwnProperty.call(this.options, key)) {
                        defaults[key] = this.options[key];
                    }
                }
                return defaults;
            },
            filtered_candidates: function() {
                var self = this;

                if (self.input && self.candidates) {
                    return self.candidates.filter(function(item) {
                        var label = self.pretty(item),
                            input = self.input.toLowerCase(),
                            escapedInput = input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        return label.toLowerCase().match(escapedInput);
                    });
                } else {
                    return self.candidates;
                }
            },
            has_value: function() {
                return this.value && this.value.length;
            },
            is_multiple: function() {
                return !!this.multiple;
            },
            is_all_selected: function() {
                var self = this,
                    i;
                if (self.is_multiple && self.candidates && self.candidates.length) {
                    for (i = 0; i < self.candidates.length; i++) {
                        if (!self.is_selected(self.candidates[i])) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            is_add_visible: function() {
                return this.input && this.config.allow_adding;
            },
            safe_placeholder: function() {
                return this.placeholder || "Search...";
            },
            safe_all_label: function() {
                return this.all_label || "All items";
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
                        this.value = model ? array_clone(model) : [];
                    } else {
                        this.value = model ? [model] : null;
                    }
                },
                immediate: true
            }
        },
        methods: {
            activate: function($event) {
                if (this.disabled) {
                    return;
                }
                $(document).trigger('close_selectboxes');
                if (!$event || ($event.keyCode !== 13 && $event.keyCode !== 27)) {
                    this.is_open = true;
                    this.focus();
                    return false;
                }
            },
            focus: function() {
                var self = this;
                if (this.disabled) {
                    return;
                }
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

                if (index === false || (this.is_selected(this.get_by_index(index)) && !this.config.allow_deselect_from_list)) {
                    this.current = false;
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
                if (this.current !== false && this.filtered_candidates.length) {
                    selected = this.filtered_candidates[this.current];
                    if (!this.is_selected(selected)) {
                        this.set_value(selected);
                    } else if (this.config.allow_deselect_from_list) {
                        this.unset_value(selected);
                    }
                    if (this.config.close_after_select) {
                        this.close();
                    } else {
                        this.focus();
                    }
                } else if (this.config.add_on_select) {
                    this.add_candidate();
                }
            },
            /**
             * Adds all currently visible items to selection.
             */
            select_filtered: function() {
                var self = this;
                self.filtered_candidates.forEach(function(candidate) {
                    if (!self.is_selected(candidate)) {
                        self.value.push(candidate);
                    }
                });
                self.$emit('update', self.value);
                self.close();
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
                    this.value = array_without(this.value, value);
                    this.$emit('update', this.value);
                } else {
                    this.value = null;
                    this.$emit('update', this.value);
                }
                if (!this.has_value && this.config.close_after_deselect) {
                    this.close();
                } else {
                    this.focus();
                }
            },
            unset_all: function() {
                this.value = this.is_multiple ? [] : null;
                this.$emit('update', this.value);
                if (!this.has_value && this.config.close_after_deselect) {
                    this.close();
                } else {
                    this.focus();
                }
            },
            pretty: function(item) {
                if ($.type(this.label) === 'function') {
                    return item ? this.label.call(null, item) : undefined;
                } else if ($.type(this.label) === 'string') {
                    return item ? item[this.label] : undefined;
                } else {
                    return item;
                }
            },
            is_selected: function(item) {
                return this.value && this.value.indexOf(item) !== -1;
            },
            add_candidate: function() {
                if (this.config.allow_adding && this.input) {
                    this.$emit('add', this.input);
                    if (this.config.close_after_add) {
                        this.close();
                    } else {
                        this.input = null;
                    }
                }
            }
        }
    };
});