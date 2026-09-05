package com.lifesim.backend.interfaces;

import com.lifesim.backend.domain.ClaimAge;
import com.lifesim.backend.domain.EmployeePensionCalculator;
import com.lifesim.backend.domain.EmployeePensionResult;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 老齢厚生年金の計算結果を返すAPIを公開する。 */
@RestController
public class EmployeePensionController {

  private static final int DEFAULT_CLAIM_AGE_YEARS = 65;

  private final EmployeePensionCalculator calculator;

  /**
   * コントローラーを生成する。
   *
   * @param calculator 計算処理
   */
  public EmployeePensionController(EmployeePensionCalculator calculator) {
    this.calculator = calculator;
  }

  /**
   * 年代別の年収・働き方、退職年齢、受給開始年齢から老齢厚生年金額を計算する。
   *
   * @param request リクエストボディ
   * @return 計算結果
   */
  @PostMapping("/api/pension/employee-pension")
  public EmployeePensionResult calculate(@RequestBody EmployeePensionRequest request) {
    if (request.decadeIncomes() == null) {
      throw new IllegalArgumentException("decadeIncomes is required");
    }
    ClaimAge claimAge =
        request.claimAge() != null ? request.claimAge() : new ClaimAge(DEFAULT_CLAIM_AGE_YEARS);
    return calculator.calculate(request.decadeIncomes(), request.retirementAge(), claimAge);
  }

  /**
   * 不正な入力を400エラーとして処理する。
   *
   * @param e 入力値検証の失敗
   * @return エラー内容を表すレスポンスボディ
   */
  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> handleInvalidInput(IllegalArgumentException e) {
    return Map.of("error", e.getMessage());
  }
}
