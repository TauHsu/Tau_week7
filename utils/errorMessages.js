const ERROR_MESSAGES = {
    FIELDS_INCORRECT: '欄位未填寫正確',
    URL_INCORRECT: '網址未填寫正確',
    PROFILE_PHOTO_URL_INCORRECT: '大頭貼網址未填寫正確',
    COACH_NOT_FOUND: '找不到該教練',
    USER_NOT_FOUND: '使用者不存在',
    UPDATE_USER_FAILED: '更新使用者失敗',
    USER_NOT_CHANGE: '使用者名稱未改變',
    ALREADY_COACH: '使用者已經是教練', 
    COURSE_NOT_FOUND: '課程不存在', 
    ALREADY_REGISTERED: '已經報名過此課程', 
    NO_CREDITS: '已無可使用堂數', 
    MAX_PARTICIPANTS_REACHED: '已達最大參加人數，無法參加',
    UPDATE_COURSE_FAILED: '更新課程失敗',
    EMAIL_NOT_RULE: 'Email不符合規則',
    EMAIL_ALREADY_USED: 'Email已被使用',
    PASSWORD_NOT_RULE: '密碼不符合規則，包含英文大小寫和數字，長度最少8字、最多16個字',
    USER_NOT_FOUND_OR_PASSWORD_FALSE: '使用者不存在或密碼輸入錯誤',
    PASSWORD_FALSE: '密碼輸入錯誤',
    PASSWORD_NEW_AND_OLD_NOT_SAME: '新密碼不能與舊密碼相同',
    PASSWORD_NEW_AND_VERIFIEDNEW_NOT_SAME: '新密碼與驗證新密碼不一致',
    UPDATE_PASSWORD_FAILED: '更新密碼失敗',
    CANCEL_FAILED: '取消失敗', 
    ID_ERROR: 'ID錯誤',
    DATA_REPEAT: '資料重複'
};

module.exports = ERROR_MESSAGES;