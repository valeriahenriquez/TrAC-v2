import { orderBy, reduce, toInteger } from "lodash";
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { FeedbackQuestionType, NO_ANSWER } from "../../constants";
import { IContext } from "../../interfaces";
import { ADMIN } from "../constants";
import {
  FeedbackFormQuestionTable,
  FeedbackFormTable,
  FeedbackResultTable,
  IFeedbackForm,
  IFeedbackFormQuestion,
  IFeedbackResult,
} from "../db/tables";
import {
  FeedbackAnswer,
  FeedbackAnswerInput,
  FeedbackForm,
  FeedbackQuestionOption,
  FeedbackResult,
} from "../entities/feedback";
import { assertIsDefined } from "../utils/assert";
import { PartialUser } from "./auth/user";

const optionsSplitChar = "|";

const optionsValueSplitChar = "=";

export function splitFeedbackQuestionOptions(
  options: string
): FeedbackQuestionOption[] {
  return options.split(optionsSplitChar).map((optionValue) => {
    const [numberValueStr, ...textValue] = optionValue.split(
      optionsValueSplitChar
    );

    return {
      value: toInteger(numberValueStr),
      text: textValue.join(optionsValueSplitChar),
    };
  });
}

export function joinFeedbackQuestionOptions(
  questionsOptions: FeedbackQuestionOption[]
): string {
  return questionsOptions
    .map((optionValue) => {
      return `${optionValue.value}${optionsValueSplitChar}${optionValue.text}`;
    })
    .join(optionsSplitChar);
}

type PartialFeedbackResult = Pick<FeedbackResult, "answers" | "form"> & {
  user: PartialUser;
};

@Resolver(() => FeedbackForm)
export class FeedbackFormResolver {
  @Authorized()
  @Query(() => FeedbackForm, { nullable: true })
  async unansweredForm(
    @Ctx() { user }: IContext
  ): Promise<FeedbackForm | null> {
    assertIsDefined(user, "Context auth is not working propertly");

    const answeredForms = await FeedbackResultTable()
      .distinct("form_id")
      .where({
        user_id: user.email,
      });

    const firstNotAnsweredForm = await FeedbackFormTable()
      .select("*")
      .whereNotIn(
        "id",
        answeredForms.map(({ form_id }) => form_id)
      )
      .orderBy("priority", "desc")
      .first();

    if (firstNotAnsweredForm) {
      const formQuestions = await FeedbackFormQuestionTable()
        .select("id", "question", "type", "priority", "options")
        .where({
          form_id: firstNotAnsweredForm.id,
        })
        .orderBy("priority", "desc");

      return {
        id: firstNotAnsweredForm.id,
        name: firstNotAnsweredForm.name,
        priority: firstNotAnsweredForm.priority,
        questions: formQuestions.map(({ options, ...restQuestion }) => {
          return {
            ...restQuestion,
            options: splitFeedbackQuestionOptions(options),
          };
        }),
      };
    }

    return null;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async answerFeedbackForm(
    @Ctx() { user }: IContext,
    @Arg("answer") feedbackAnswerInput: FeedbackAnswerInput
  ) {
    assertIsDefined(user, "Authorization context not working properly");

    const [form, questions] = await Promise.all([
      FeedbackFormTable()
        .select("id")
        .where({
          id: feedbackAnswerInput.form,
        })
        .first(),
      FeedbackFormQuestionTable()
        .select("id", "options", "type")
        .whereIn(
          "question",
          feedbackAnswerInput.questions.map(({ question }) => question)
        ),
    ]);

    if (form && questions) {
      const feedbackAnswers: IFeedbackResult[] = questions.map(
        (questionDbValue) => {
          return {
            form_id: form.id,
            question_id: questionDbValue.id,
            user_id: user.email,
            answer:
              feedbackAnswerInput.questions.find((questionFeedbackValue) => {
                if (questionFeedbackValue.question === questionDbValue.id) {
                  if (questionDbValue.type === FeedbackQuestionType.OpenText) {
                    return true;
                  } else {
                    const options = splitFeedbackQuestionOptions(
                      questionDbValue.options
                    );

                    const answerValue = toInteger(questionFeedbackValue.answer);
                    return options.some((feedbackQuestionOption) => {
                      return feedbackQuestionOption.value === answerValue;
                    });
                  }
                }

                return;
              })?.answer || NO_ANSWER,
          };
        }
      );

      await FeedbackResultTable().insert(feedbackAnswers);

      return true;
    }

    return false;
  }

  @Authorized([ADMIN])
  @Query(() => [FeedbackResult])
  async feedbackResults(): Promise<PartialFeedbackResult[]> {
    const [allFeedbackAnswers, allForms, allQuestions] = await Promise.all([
      FeedbackResultTable().select("*"),
      FeedbackFormTable().select("*"),
      FeedbackFormQuestionTable().select("*"),
    ]);

    const questionsHashByForm = allQuestions.reduce<
      Record<number, IFeedbackFormQuestion[]>
    >((acum, value) => {
      if (value.form_id in acum) {
        acum[value.form_id].push(value);
      } else {
        acum[value.form_id] = [value];
      }
      return acum;
    }, {});

    const formsHashById = allForms.reduce<
      Record<number, IFeedbackForm & { questions: IFeedbackFormQuestion[] }>
    >((acum, value) => {
      acum[value.id] = {
        ...value,
        questions: questionsHashByForm[value.id] ?? [],
      };
      return acum;
    }, {});

    const feedbackAnswersHashByFormIdAndUser = allFeedbackAnswers.reduce<
      Record<
        string,
        {
          result: IFeedbackResult[];
          form?: typeof formsHashById[number];
        }
      >
    >((acum, value) => {
      if (value.user_id in acum) {
        acum[value.user_id].result.push(value);
      } else {
        acum[value.user_id] = {
          result: [value],
          form: formsHashById[value.form_id],
        };
      }
      return acum;
    }, {});

    return orderBy(
      reduce(
        feedbackAnswersHashByFormIdAndUser,
        (acum, { form, result }, userEmail) => {
          if (form) {
            type IFormQuestion = {
              id: number;
              question: string;
              type: FeedbackQuestionType;
              priority: number;
              options: FeedbackQuestionOption[];
            };
            type IFormQuestionObj = {
              array: IFormQuestion[];
              hash: Record<string, IFormQuestion>;
            };

            const formQuestions = form.questions.reduce<IFormQuestionObj>(
              (acum, { options, ...restQuestionValue }) => {
                const question = {
                  ...restQuestionValue,
                  options: splitFeedbackQuestionOptions(options),
                };

                acum.array.push(question);

                acum.hash[question.id] = question;

                return acum;
              },
              {
                array: [],
                hash: {},
              }
            );

            acum.push({
              form: {
                id: form.id,
                name: form.name,
                priority: form.priority,
                questions: orderBy(
                  formQuestions.array,
                  (val) => val.priority,
                  "desc"
                ),
              },
              answers: orderBy(
                result.reduce<FeedbackAnswer[]>((acum, resultValue) => {
                  const resultQuestion =
                    formQuestions.hash[resultValue.question_id];

                  if (resultQuestion) {
                    acum.push({
                      question: resultQuestion,
                      answer: resultValue.answer,
                    });
                  }

                  return acum;
                }, []),
                (val) => val.question.priority,
                "desc"
              ),
              user: {
                email: userEmail,
              },
            });
          }
          return acum;
        },
        [] as PartialFeedbackResult[]
      ),
      (val) => val.form.priority,
      "desc"
    );
  }
}
