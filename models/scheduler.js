const { sequelize, Sequelize : { QueryTypes } } = require('./index');
const logger = require('../lib/logger');

/**
* 스케줄러 Model 
*
*/
const scheduler = {
	/**
	* 스케줄 달력 일자 + 스케줄 
	*
	* @param Int|string year 
	* @param int|string month 
	*
	* @return JSON 
	*/
	getCalendar : async function(year, month) {
		let date = new Date();
		year = year || date.getFullYear();
		month = month || date.getMonth() + 1;
		month = Number(month);
		
		/**
		1. 현재 달의 시작일, 현재 달의 마지막일(30, 31, 28, 29)
		2. 현재 달의 시작일의 요일
		*/
		date = new Date(year, month - 1, 1);
		const timeStamp = date.getTime();
		const dayStamp = 60 * 60 * 24 * 1000;
		
		const yoil = date.getDay(); // 0~6
		const startNo = yoil * -1;
		const endNo = 42 + startNo; // startNo 음수 아니면 0
		
		let nextMonthDays = 0;
		let days = []; // 날짜 
		for (let i = startNo; i < endNo; i++) {
			const newStamp = timeStamp + dayStamp * i;
			date = new Date(newStamp);
			
			const newYear = date.getFullYear();
			let newMonth = Number(date.getMonth() + 1);
			let newDay = date.getDate();
			if (newStamp > timeStamp && month != newMonth) { // 다음달 
				nextMonthDays++;
			}
			
			newMonth = (newMonth < 10)?"0"+newMonth:newMonth;
			newDay = (newDay < 10)?"0"+newDay:newDay;
			
			const str = `${newYear}.${newMonth}.${newDay}`;
			
			days.push({
				'date' : str, // 2020.07.20
				'day' : newDay, // 01, 02 
				'yoil' :  this.getYoil(newStamp), // 한글 요일 
				'yoilEn' : this.getYoil(newStamp, 'en'), // 영문 요일 
				'stamp' : newStamp,
				'object' : date,
			});
		} // endfor 
		
		
		
		/** 스케줄 조회 S */
		const schedules= await this.get(days[0].object, days[days.length - 1].object);
		const colors = Object.keys(this.getColors());
		
		days.forEach((v, i, _days) => {
			let isContinue = true;
			if (i >= 35) {
				if (nextMonthDays >= 7) {
					delete _days[i];
					isContinue = false;
				}
			}
			
			if (isContinue) {
				const date = v.date.replace(/\./g, "");
				const schedule = {};
				colors.forEach((color) => {
					const cl = color.replace(/#/g, "");
					const key = "S" + date + "_" + cl;
					schedule[cl] = schedules[key]?schedules[key]:[];
				});
				
				_days[i].schedules = schedule;
			}
		});
		/** 스케줄 조회 E */
		
		if (nextMonthDays >= 7) {	
			days.length = 35;
		}
		
		let nextYear = year, prevYear = year;
		let nextMonth = month, prevMonth = month;
		if (month == 1) {
			prevYear--;
			prevMonth = 12;
			nextMonth++;
		} else if (month == 12) {
			nextYear++;
			nextMonth = 1;
			prevMonth--;
		} else {
			prevMonth--;
			nextMonth++;
		}
		
		const yoilsEn = this.getYoils('en');
		const fontColor = this.getColors();
		return { days, year, month, yoilsEn, prevYear, prevMonth, nextYear, nextMonth, colors, fontColor };
	},
	/**
	* 현재 요일(일~토)
	*
	*/
	getYoil : function (timeStamp, mode) {
		mode = mode || "ko";
		let date;
		if (timeStamp) {
			date = new Date(timeStamp);
		} else {
			date = new Date();
		}
		
		const yoils = this.getYoils(mode);
		const yoil = date.getDay();
		
		return yoils[yoil];
	},
	getYoils : function(mode) {
		mode = mode || 'ko';
		if (mode == 'ko') { // 한글 요일 
			return ["일", "월", "화", "수", "목", "금", "토"];
		} else { // 영어 요일 
			return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
		}
	},
	/**
	* 선택 가능 색상 코드(hexcode + 영문색상명)
	*
	*/
	getColors : function() {
		return {
			pink :"black",
			blue : "white",
			skyblue : "black",
			orange : "white",
			red : "white",
			gray : "black",
		}
	},
	/**
	* 스케줄 추가 
	*
	*  
	*/
	add : async function (params) {
		const startDate = params.startDate.split(".");
		const startStamp = new Date(startDate[0], Number(startDate[1]) - 1, startDate[2]).getTime();
		
		const endDate = params.endDate.split('.');
		const endStamp = new Date(endDate[0], Number(endDate[1]) -1, endDate[2]).getTime();

		const step = 60 * 60 * 24 * 1000;
		const period = startStamp + "_" + endStamp;
		
		/** 이미 선점된 스케줄이 있으면 등록,수정 불가 */
		const isExists = await this.checkColor(period, params.color, params.prevColor);
		if (isExists) 
			return false;
		
		try {
			if (params.prevColor) {				
				const sql = "DELETE FROM schedule WHERE period = :period AND color = :color";
				await sequelize.query(sql, {
					replacements : { period : params.prevPeriod, color: params.prevColor },
					type : QueryTypes.DELETE,
				});
			}
			
			for (let i = startStamp; i <= endStamp; i += step) {
				const sql = `INSERT INTO schedule (scheduleDate, title, color, period) 
										VALUES (:scheduleDate, :title, :color, :period)`;
				
				const replacements = {
					scheduleDate : new Date(i),
					title : params.title,
					color : params.color,
					period,
				};
				await sequelize.query(sql, {
					replacements,
					type : QueryTypes.INSERT,
				});
			}
			
			return true;
		} catch (err) {
			logger(err.message, 'error');
			logger(err.stack, 'error');
			return false;
		}
	},
	/**
	* 스케줄 조회
	*
	*/
	get : async function (sdate, edate) {
		if (!sdate || !edate) 
			return false;
		
		const sql = `SELECT * FROM schedule WHERE scheduleDate BETWEEN ? AND ?`;
		const rows = await sequelize.query(sql, {
			replacements : [sdate, edate],
			type : QueryTypes.SELECT,
		});
		
		const list = {};
		rows.forEach( async(v) => {
			let key = "S" + v.scheduleDate.replace(/-/g, "");
			key += "_" + v.color.replace(/#/g, "");
			list[key] = list[key] || [];
			list[key].push(v);
		});
		
		return list;
	},
	/**
	* unixtimestamp -> 날짜 형식 
	*
	*/
	getDate : function (stamp, mode) {
		const date = new Date(Number(stamp));
		const year = date.getFullYear();
		let month = date.getMonth() + 1;
		month = (month < 10)?"0"+month:month;
		let day = date.getDate();
		day = (day < 10)?"0"+day:day;
		
		if (mode == 'period') {
			const yoils = this.getYoils();
			const yoil = date.getDay();
			
			return `${Number(month)}월 ${Number(day)}일 ${yoils[yoil]}요일`;
		} else{
			return `${year}.${month}.${day}`;
		}
	},
	/**
	* 스케줄 조회
	*
	*/
	getSchedule : async function(stamp, color) {
		try {
			const sql = "SELECT * FROM schedule WHERE scheduleDate = ? AND color = ?";
			let rows = await sequelize.query(sql, {
				replacements : [new Date(Number(stamp)), color],
				type : QueryTypes.SELECT,
			});
			
			rows = rows[0] || {};
			if (rows) {
				// 스케줄 기간 
				const period = rows.period.split("_");
				const startDate = this.getDate(period[0], 'period');
				const endDate = this.getDate(period[1], 'period');
				rows.periodStr = startDate + " ~ " + endDate;				
			}
			
			return rows;
		} catch (err) {
			logger(err.message, 'error');
			logger(err.stack, 'error');
			return {};
		}
	},
	/**
	* 스케줄 삭제 
	*
	*/
	delete : async function (period, color) {
		if (!period || !color) 
			return false;
		
		try {
			const sql = "DELETE FROM schedule WHERE period = ? AND color = ?";
			await sequelize.query(sql, {
				replacements : [period, color],
				type : QueryTypes.DELETE,
			});
		
			return true;
		} catch (err) {
			logger(err.message, 'error');
			logger(err.stack, 'error');
			return false;
		}
	},
	/**
	* 스케줄 수정 정보 
	*
	*/
	getInfo : async function (period, color) {
		const sql = 'SELECT title FROM schedule WHERE period = ? AND color = ? LIMIT 1';
		const rows = await sequelize.query(sql, {
			replacements : [period, color],
			type : QueryTypes.SELECT,
		});
		
		if (rows.length == 0) 
			return {};
		
		const periods = period.split("_");
		const startDate = this.getDate(periods[0]);
		const endDate = this.getDate(periods[1]);
		const data = {
			stamp : Number(periods[0]),
			startDate,
			endDate,
			title : rows[0].title,
			color,
		}
		
		return data;
	},
	/**
	* 색상변경 처리 
	*
	*/
	changeColor : async function(period, prevColor, color) {
		try {
			const isExists = await this.checkColor(period, color);
			if (isExists)
				return false;
			
			const sql = `UPDATE schedule 
									SET 
										color = :color 
									WHERE 
										period = :period AND color = :prevColor`;
			const replacements = { color, period, prevColor };
			
			await sequelize.query(sql, {
				replacements,
				type : QueryTypes.UPDATE,
			});
			
			return true;
		} catch (err) {
			logger(err.message, 'error');
			logger(err.stack, 'error');
			return false;
		}
	},
	/**
	* 스케줄 색상 선점여부 체크
	*
	*/
	checkColor : async function(period, color, prevColor) {
		period = period.split("_");
		const sDate = new Date(Number(period[0]));
		const eDate = new Date(Number(period[1]));
		
		let sql = "SELECT COUNT(*) as cnt FROM schedule WHERE scheduleDate BETWEEN :sDate AND :eDate AND color = :color";
		const replacements = { sDate, eDate, color };
		
		if (prevColor) {
			sql += " AND color <> :prevColor";
			replacements.prevColor = prevColor;
		}
		
		const rows = await sequelize.query(sql, {
			replacements, 
			type : QueryTypes.SELECT,
		});
		
		return rows[0].cnt > 0;
	},
	/**
	* 오늘 스케줄 조회 
	*
	*/
	getTodaySchedules : async function() {
		try {
			const date = new Date();
			const scheduleDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
			const sql = "SELECT * FROM schedule WHERE scheduleDate = ? AND isChecked = 0";
			const rows = await sequelize.query(sql, {
				replacements : [scheduleDate],
				type : QueryTypes.SELECT,
			});
			
			return rows;
		} catch(err) {
			logger(err.message, 'error');
			logger(err.stack, 'error');
			return [];
		}
	},
	/**
	* 오늘 스케줄 확인 처리 
	*
	*/
	confirmTodaySchedule : async function(colors) {
		if (!colors) 
			return false;
		
		try {
			const date = new Date();
			const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
			colors.forEach(async (color) => {
				const sql = `UPDATE schedule 
										SET 
											isChecked = 1 
									WHERE 
											scheduleDate = ? AND color = ?`;
				await sequelize.query(sql, {
					replacements : [today, color],
					type : QueryTypes.UPDATE,
				});
			});
			
			return true;
		} catch (err) {
			logger(err.message, 'error');
			logger(err.stack, 'error');
			return false;
		}
	},
};


module.exports = scheduler;