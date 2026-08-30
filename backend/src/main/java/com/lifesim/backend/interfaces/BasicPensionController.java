package com.lifesim.backend.interfaces;

import com.lifesim.backend.domain.BasicPensionCalculator;
import com.lifesim.backend.domain.BasicPensionResult;
import com.lifesim.backend.domain.ClaimAge;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 老齢基礎年金の計算結果を返すAPIを公開する。 */
@RestController
public class BasicPensionController {

  private static final int DEFAULT_CLAIM_AGE_YEARS = 65;

  private final BasicPensionCalculator calculator;

  /**
   * コントローラーを生成する。
   *
   * @param calculator 計算処理
   */
  public BasicPensionController(BasicPensionCalculator calculator) {
    this.calculator = calculator;
  }

  /**
   * 受給資格期間・受給開始年齢から老齢基礎年金額を計算する。
   *
   * @param request リクエストボディ
   * @return 計算結果
   */
  @PostMapping("/api/pension/basic-pension")
  public BasicPensionResult calculate(@RequestBody BasicPensionRequest request) {
    if (request.eligibilityPeriod() == null) {
      throw new IllegalArgumentException("eligibilityPeriod is required");
    }
    ClaimAge claimAge =
        request.claimAge() != null ? request.claimAge() : new ClaimAge(DEFAULT_CLAIM_AGE_YEARS);
    return calculator.calculate(request.eligibilityPeriod(), claimAge);
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
