package com.lifesim.backend.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

/** ある期間における働き方。老齢厚生年金の加入対象かどうかの判定に使う。 */
public enum WorkStyle {
  /** 会社員・公務員(第2号被保険者に相当)。厚生年金の加入対象。 */
  @JsonProperty("employee")
  EMPLOYEE,

  /** 自営業・フリーランス・学生など(第1号被保険者に相当)。厚生年金の加入対象外。 */
  @JsonProperty("self_employed")
  SELF_EMPLOYED,

  /** 配偶者の扶養に入っている(第3号被保険者に相当)。厚生年金の加入対象外。 */
  @JsonProperty("dependent_spouse")
  DEPENDENT_SPOUSE
}
