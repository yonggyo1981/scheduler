$(function() {
	$(".scheduler .day .no").click(function() {
		const stamp = $(this).closest(".day").data("stamp");
		const url = "/schedule?stamp=" + stamp;
		yh.layer.popup(url, 400, 500);
	});
	
	/** 스케줄 조회, 삭제 */
	$(".scheduler .schedule").click(function() {
		const stamp = $(this).closest(".day").data("stamp");
		const color = $(this).data("color");
		url = `/schedule/view/${stamp}/${color}`;
		yh.layer.popup(url, 400, 350);
	});
	
	/** 스케줄 삭제 */
	$("body").on("click", ".schedule_view .delete", function() {
		if (!confirm('정말 삭제하시겠습니까?')) {
			return;
		}
		
		$obj = $(this).closest(".schedule_view")
		const period = $obj.data("period");
		const color = $obj.data("color");
		const url = "/schedule";

		const formData = new FormData();
		formData.period = period;
		formData.color = color;
		
		axios.delete(url, { params : formData })
			.then(function(res) {
				if (res.data.success) { // 삭제 성공 
					location.reload();
				} else { // 삭제 실패 
					alert("삭제 실패");
				}
			})
			.catch(function(err) {
				console.error(err);
			});
	});
	
	/** 스케줄 수정 */
	$("body").on("click", ".schedule_view .modify", function() {
		$obj = $(this).closest(".schedule_view");
		const period = $obj.data("period");
		const color = $obj.data("color");
		const url = `/schedule/${period}/${color}`;
		console.log(url);
		yh.layer.popup(url, 400, 500);
	});
	
	
	/** 스케줄 저장 */
	$("body").on("click", "#frmSchedule .save", function() {
		/**
		1. 유효성 검사 - O
			 - 제목, 시작, 종료일 
		2. axios -> 저장 처리 요청 
		3. DB 처리 
		*/
		try {
			if (!frmSchedule.title.value) {
				throw new Error("일정 제목을 입력하세요.");
			}
			
			if (!frmSchedule.startDate.value) {
				throw new Error("시작일을 입력하세요.");
			}
			
			if (!frmSchedule.endDate.value) {
				throw new Error("종료일을 입력하세요.");
			}
		} catch (err) {
			alert(err.message);
			return;
		}
		
		/** 스케줄 저장 양식 -> querystring 형태로 변경 */
		const qs = $("#frmSchedule").serialize();
		
		/** axios로 ajax 처리 */
		axios.post('/schedule', qs)
			.then(function(res) {
				if (res.data.success) {
					location.reload();
				} else {
					alert("스케줄 등록 실패 하였습니다.");
				}
			})
			.catch(function(err) {
				console.error(err);
			});
	});
	
	 $.datepicker.setDefaults({
        dateFormat: 'yymmdd',
        prevText: '이전 달',
        nextText: '다음 달',
        monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        dayNames: ['일', '월', '화', '수', '목', '금', '토'],
        dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
        dayNamesMin: ['일', '월', '화', '수', '목', '금', '토'],
        showMonthAfterYear: true,
        yearSuffix: '년'
    });
	
	/** datepicker */
	$("body").on("click focus", ".datepicker", function() {
		$(this).datepicker({
			dateFormat : "yy.mm.dd",
		});
	});
});