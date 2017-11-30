(function(context, definition) {
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil', 'VueDatePicker'], definition);
	} else {
		context.VueCalendar = definition(context.Vue, context.VueUtil, context.VueDatePicker);
		delete context.VueCalendar;
	}
})(this, function (Vue, VueUtil, VueDatePicker) {
	'use strict';
	var EventCard = {
		props: {
			date: Date,
			firstDay: Number,
			event: Object
		},
		render: function(createElement) {
			var self = this;
			var event = self.event;
			var start = VueUtil.toDate(event.start);
			var end = VueUtil.toDate(event.end);
			var showTitile = (self.date.getDay() === self.firstDay || VueUtil.formatDate(start) === VueUtil.formatDate(self.date));
			var eventClass = [];
			var customClass = event.customClass;
			if (VueUtil.isDef(customClass)) {
				if (VueUtil.isArray(customClass)) {
					eventClass = [].concat(customClass);
				} else {
					eventClass.push(customClass);
				}
			}
			if (VueUtil.formatDate(start) === VueUtil.formatDate(self.date)) {
				eventClass.push('is-start');
			}
			if (VueUtil.formatDate(end) === VueUtil.formatDate(self.date)) {
				eventClass.push('is-end');
			}
			if (!event.isShow) {
				eventClass.push('is-opacity');
			}
			eventClass = eventClass.join(' ');
			var eventItem = createElement('div', {
				class: ['vue-full-calendar__event-item', eventClass],
				on: {
					click: function(e) {
						self.$emit('click', event, e);
					}
				},
			}, []);
			if (showTitile) {
				var dateCount = Math.round((end.getTime() - self.date.getTime()) / 86400000) + 1;
				var lastDayCount = 7 - self.date.getDay();
				var defaultWidth = (self.$parent.eventLimit + 2) * 20;
				lastDayCount > dateCount ? defaultWidth = defaultWidth * dateCount : defaultWidth = defaultWidth * lastDayCount;
				if (eventClass.indexOf('is-start') !== -1) defaultWidth = defaultWidth - 4;
				eventItem = createElement('div', null, [createElement('div', {
					class: ['vue-full-calendar__event-item', eventClass],
					style: {'position': 'absolute', 'width': defaultWidth + 'px'},
					on: {
						click: function(e) {
							self.$emit('click', event, e);
						}
					},
				}, [event.title]), createElement('div', {
					class: ['vue-full-calendar__event-item', 'is-opacity'],
				}, [])]);
			}
			return eventItem;
			
		}
	};
	var FcHeader = {
		template: '<div class="vue-full-calendar-header"><div class="vue-full-calendar-header__left"><slot name="header-left"></slot></div><div class="vue-full-calendar-header__center"><button type="button" @click="changeMonth(-1 , \'year\')" class="vue-picker-panel__icon-btn vue-date-picker__prev-btn vue-icon-d-arrow-left"></button><button type="button" @click="changeMonth(-1, \'month\')" class="vue-picker-panel__icon-btn vue-date-picker__prev-btn vue-icon-arrow-left"></button><vue-popover trigger="click"><year-table @pick="handleYearPick" :year="currentMonth.getFullYear()"></year-table><span slot="reference" class="vue-date-picker__header-label">{{yearLabel}}</span></vue-popover><vue-popover trigger="click"><month-table @pick="handleMonthPick" :month="currentMonth.getMonth()"></month-table><span slot="reference" :class="[\'vue-date-picker__header-label\']">{{monthLabel}}</span></vue-popover><button type="button" @click="changeMonth(1 , \'year\')" class="vue-picker-panel__icon-btn vue-date-picker__next-btn vue-icon-d-arrow-right"></button><button type="button" @click="changeMonth(1 , \'month\')" class="vue-picker-panel__icon-btn vue-date-picker__next-btn vue-icon-arrow-right"></button></div><div class="vue-full-calendar-header__right"><slot name="header-right"></slot><span class="thisMonth" @click="changeToNow">{{$t(\'vue.datepicker.thisMonth\')}}</span></div></div>',
		props: {
			currentMonth: Date,
			firstDay: Number
		},
		components: {
			YearTable: VueDatePicker().YearTable,
			MonthTable: VueDatePicker().MonthTable
		},
		computed: {
			monthLabel: function() {
				var month = this.currentMonth.getMonth() + 1
				return this.$t('vue.datepicker.month' + month);
			},
			yearLabel: function() {
				var year = this.currentMonth.getFullYear();
				if (!year) return '';
				var yearTranslation = this.$t('vue.datepicker.year');
				return year + ' ' + yearTranslation;
			}
		},
		methods: {
			handleYearPick: function(year) {
				var result = new Date();
				this.currentMonth.setFullYear(year);
				result.setTime(this.currentMonth.getTime());
				this.$emit('change', result);
			},
			handleMonthPick: function(month) {
				var result = new Date();
				this.currentMonth.setMonth(month);
				result.setTime(this.currentMonth.getTime());
				this.$emit('change', result);
			},
			changeMonth: function(num, type) {
				var newMonth = VueUtil.addDate(this.currentMonth, num, type);
				this.$emit('change', newMonth);
			},
			changeToNow: function() {
				this.$emit('change', new Date);
			}
		}
	};
	var FullCalendar = {
		template: '<div class="vue-full-calendar" :style="compStyle"><fc-header :current-month="currentMonth" :first-day="firstDay" @change="emitChangeMonth"></fc-header><div class="vue-full-calendar-body"><div class="vue-full-calendar__weeks"><div class="vue-full-calendar__week" v-for="(week, weekIndex) in WEEKS" :key="weekIndex">{{ $t(\'vue.datepicker.weeks.\'+week) }}</div></div><div class="vue-full-calendar__dates"><div class="vue-full-calendar__dates-events"><div class="vue-full-calendar__events-week" v-for="(week,weekIndex) in currentDates" :key="weekIndex"><div v-for="(day, dayIndex) in week" :style="eventDayStyle" :key="dayIndex" :class="[\'vue-full-calendar__events-day\', {\'today\': day.isToday}]" @click="dayclick(day.date, $event)"><div class="day-number">{{day.monthDay}}</div><div class="vue-full-calendar__event-box"><event-card :event="event" :date="day.date" :firstDay="firstDay" v-for="(event, eventIndex) in day.events" :key="eventIndex" v-show="event.cellIndex <= eventLimit" @click="eventclick"></event-card><vue-popover trigger="click" v-if="day.events.length > eventLimit && showMore" :title="moreTitle(selectDay.date)"><div class="vue-full-calendar__more-events"><ul class="events-list"><li v-for="(event, eventIndex) in selectDay.events" :key="eventIndex" v-show="event.isShow" :class="[\'vue-full-calendar__event-item\', event.customClass]" @click="eventclick(event, $event)">{{event.title}}</li></ul></div><div slot="reference" class="more-link" @click="moreclick(day)">+ {{day.events[day.events.length -1].cellIndex - eventLimit}}</div></vue-popover><div v-if="day.events.length > eventLimit && !showMore" class="more-link">+ {{day.events[day.events.length -1].cellIndex - eventLimit}}</div></div></div></div></div></div></div></div>',
		props: {
			events: Array,
			eventLimit: Number,
			showMore: Boolean
		},
		components: {
			EventCard: EventCard,
			FcHeader: FcHeader
		},
		mounted: function() {
			this.emitChangeMonth(this.currentMonth);
		},
		data: function() {
			return {
				currentMonth: new Date,
				firstDay: 0,
				selectDay: {}
			}
		},
		computed: {
			currentDates: function() {
				return this.getCalendar()
			},
			WEEKS: function() {
				var WEEKS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
				var week = this.firstDay;
				return WEEKS.concat(WEEKS).slice(week, week + 7);
			},
			eventDayStyle: function() {
				var style = {};
				var height = (this.eventLimit + 2) * 20;
				style.height = height + 'px';
				return style;
			},
			compStyle: function() {
				var style = {};
				var width = (this.eventLimit + 2) * 20 * 7 + 43;
				var height = (this.eventLimit + 2) * 20 * 7 + 63 - this.eventLimit * 20;
				style.width = width + 'px';
				style.height = height + 'px';
				return style;
			}
		},
		methods: {
			emitChangeMonth: function(firstDayOfMonth) {
				this.currentMonth = firstDayOfMonth;
				var start = VueUtil.getStartDateOfMonth(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth());
				var end = VueUtil.addDate(start, 6, 'week')
				this.$emit('changemonth', start, end, firstDayOfMonth)
			},
			moreTitle: function(date) {
				if (!date) return '';
				return VueUtil.formatDate(date);
			},
			getCalendar: function() {
				var monthViewStartDate = VueUtil.getStartDateOfMonth(this.currentMonth.getFullYear(), this.currentMonth.getMonth());
				var calendar = [];
				for (var perWeek = 0; perWeek < 6; perWeek++) {
					var week = [];
					for (var perDay = 0; perDay < 7; perDay++) {
						week.push({
							monthDay: monthViewStartDate.getDate(),
							isToday: (VueUtil.formatDate(monthViewStartDate) === VueUtil.formatDate(new Date)),
							weekDay: perDay,
							date: monthViewStartDate,
							events: this.slotEvents(monthViewStartDate)
						});
						monthViewStartDate = VueUtil.addDate(monthViewStartDate, 1);
					}
					calendar.push(week);
				}
				return calendar
			},
			slotEvents: function(date) {
				var cellIndexArr = [];
				var events = [].concat(this.events);
				var thisDayEvents = events.filter(function(day) {
					var st = VueUtil.toDate(day.start).getTime();
					var ed = VueUtil.toDate(day.end ? day.end : st).getTime();
					var de = VueUtil.toDate(VueUtil.formatDate(date)).getTime();
					return (de >= st && de <= ed);
				});
				thisDayEvents.sort(function(a, b) {
					if (!a.cellIndex) return 1;
					if (!b.cellIndex) return -1;
					return a.cellIndex - b.cellIndex
				});
				for (var i=0; i<thisDayEvents.length; i++) {
					thisDayEvents[i].cellIndex = thisDayEvents[i].cellIndex || (i + 1);
					thisDayEvents[i].isShow = true;
					if (thisDayEvents[i].cellIndex === i + 1 || i > this.eventLimit) continue;
					var formatDate = VueUtil.formatDate(date);
					thisDayEvents.splice(i, 0, {
						cellIndex: i + 1,
						start: formatDate,
						end: formatDate,
						isShow: false
					})
				}
				return thisDayEvents
			},
			findEventsByDate: function(date, events){
				var findEvents = [];
				if (events && events.length>0) {
					events.forEach(function(event){
						var st = VueUtil.toDate(event.start).getTime();
						var ed = VueUtil.toDate(event.end ? event.end : st).getTime();
						var de = VueUtil.toDate(VueUtil.formatDate(date)).getTime();
						if (de >= st && de <= ed) {
							findEvents.push(event);
						}
					});
				}
				return findEvents;
			},
			moreclick: function(day) {
				this.selectDay = day;
			},
			dayclick: function(date, jsEvent) {
				var current = this.$el.querySelector('.current');
				if (VueUtil.isDef(current)) {
					current.classList.remove('current');
				}
				jsEvent.currentTarget.classList.add('current');
				var dateEvents = this.findEventsByDate(date, this.events);
				this.$emit('dayclick', date, dateEvents);
			},
			eventclick: function(event, jsEvent) {
				if (!event.isShow) return;
				jsEvent.stopPropagation();
				this.$emit('eventclick', event, jsEvent);
			}
		}
	};
	var DefaultCalendar = {
		template: '<div :style="{width: width + \'px\'}" class="vue-picker-panel vue-date-picker has-time"><div class="vue-picker-panel__body-wrapper"><div class="vue-picker-panel__body"><div class="vue-date-picker__header" v-show="currentView !== \'time\'"><button type="button" @click="prevYear" class="vue-picker-panel__icon-btn vue-date-picker__prev-btn vue-icon-d-arrow-left"></button><button type="button" @click="prevMonth" v-show="currentView === \'date\'" class="vue-picker-panel__icon-btn vue-date-picker__prev-btn vue-icon-arrow-left"></button><span @click="showYearPicker" class="vue-date-picker__header-label">{{yearLabel}}</span><span @click="showMonthPicker" v-show="currentView === \'date\'" :class="[\'vue-date-picker__header-label\', {active: currentView === \'month\'}]">{{monthLabel}}</span><button type="button" @click="nextYear" class="vue-picker-panel__icon-btn vue-date-picker__next-btn vue-icon-d-arrow-right"></button><button type="button" @click="nextMonth" v-show="currentView === \'date\'" class="vue-picker-panel__icon-btn vue-date-picker__next-btn vue-icon-arrow-right"></button></div><div class="vue-picker-panel__content"><date-table v-show="currentView === \'date\'" @pick="handleDatePick" :year="year" :month="month" :date="date" :week="week" :selection-mode="selectionMode" :first-day-of-week="firstDayOfWeek" :disabled-date="disabledDate" :events="events"></date-table><year-table ref="yearTable" :year="year" :date="date" v-show="currentView === \'year\'" @pick="handleYearPick" :disabled-date="disabledDate"></year-table><month-table :month="month" :date="date" v-show="currentView === \'month\'" @pick="handleMonthPick" :disabled-date="disabledDate"></month-table></div></div></div><div class="vue-picker-panel__footer"><a href="JavaScript:" class="vue-picker-panel__link-btn" @click="changeToNow">{{nowLabel}}</a></div></div>',
		mixins: [VueDatePicker().DatePanel],
		data: function() {
			return {
				date: new Date(),
				selectionMode: 'day',
				currentView: 'date',
				disabledDate: {},
				firstDayOfWeek: 0,
				year: null,
				month: null,
				week: null,
				width: 0
			};
		},
		props: {
			events: Array
		},
		computed: {
			yearLabel: function() {
				var year = this.year;
				if (!year)
					return '';
				var yearTranslation = this.$t('vue.datepicker.year');
				if (this.currentView === 'year') {
					var startYear = Math.floor(year / 10) * 10;
					if (yearTranslation) {
						return startYear + ' ' + yearTranslation + ' - ' + (startYear + 9) + ' ' + yearTranslation;
					}
					return startYear + ' - ' + (startYear + 9);
				}
				return this.year + ' ' + yearTranslation;
			},
			monthLabel: function() {
				return this.$t('vue.datepicker.month' + (this.month + 1));
			},
			nowLabel: function() {
				return this.$t('vue.datepicker.today');
			}
		},
		mounted: function() {
			if (this.date && !this.year) {
				this.year = this.date.getFullYear();
				this.month = this.date.getMonth();
			}
			this.$emit('pick', this.date);
		},
		created: function() {
			this.$on('pick', function(date) {
				var findEventsByDate = function(date, events){
					if (events && events.length>0) {
						var findEvents = [];
						events.forEach(function(event){
							var st = VueUtil.toDate(event.start).getTime();
							var ed = VueUtil.toDate(event.end ? event.end : st).getTime();
							var de = VueUtil.toDate(VueUtil.formatDate(date)).getTime();
							if (de >= st && de <= ed) {
								findEvents.push(event);
							}
						});
						return findEvents;
					}
				};
				var dateEvents = findEventsByDate(date, this.events);
				this.$emit('dayclick', date, dateEvents);
			});
		}
	};
	var VueCalendar = {
		template: '<full-calendar v-if="full" :events="events" :event-limit="eventLimit" :show-more="showMore" @dayclick="dayclick" @eventclick="eventclick"></full-calendar><calendar v-else :events="events" @dayclick="dayclick"></calendar>',
		name: 'VueCalendar',
		components: {
			calendar: DefaultCalendar,
			FullCalendar: FullCalendar
		},
		props: {
			events: {
				type: Array,
				default: []
			},
			eventLimit: {
				type: Number,
				default: 2
			},
			showMore: {
				type: Boolean,
				default: true
			},
			full: Boolean
		},
		methods: {
			dayclick: function(day, events) {
				this.$emit('dayclick', day, events);
			},
			eventclick: function(event, jsEvent) {
				this.$emit('eventclick', event, jsEvent);
			}
		}
	};
	Vue.component(VueCalendar.name, VueCalendar);
});
