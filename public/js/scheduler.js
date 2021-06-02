$(function() {
	$(".scheduler .day").click(function() {
		const stamp = $(this).data("stamp");
		const url = "/schedule?stamp=" + stamp;
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
});