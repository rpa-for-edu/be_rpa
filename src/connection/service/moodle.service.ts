import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface MoodleConfig {
  baseUrl: string;
  token: string;
}

export interface MoodleApiResponse {
  [key: string]: any;
}

@Injectable()
export class MoodleService {
  private readonly logger = new Logger(MoodleService.name);
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        timeout: 30000,
      },
    });
  }

  /**
   * Verify Moodle connection by calling a simple API function
   */
  async verifyConnection(config: MoodleConfig): Promise<boolean> {
    try {
      const result = await this.callMoodleApi(config, 'core_webservice_get_site_info');
      return !!result && !result.exception;
    } catch (error) {
      this.logger.error(`Failed to verify Moodle connection: ${error.message}`);
      return false;
    }
  }

  /**
   * Get site information from Moodle
   */
  async getSiteInfo(config: MoodleConfig): Promise<MoodleApiResponse> {
    return this.callMoodleApi(config, 'core_webservice_get_site_info');
  }

  /**
   * Call Moodle Web Service API
   */
  async callMoodleApi(
    config: MoodleConfig,
    functionName: string,
    params: Record<string, any> = {},
  ): Promise<MoodleApiResponse> {
    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/webservice/rest/server.php`;

    const data = new URLSearchParams({
      wstoken: config.token,
      wsfunction: functionName,
      moodlewsrestformat: 'json',
      ...this.flattenParams(params),
    });

    try {
      const response = await this.axiosInstance.post(endpoint, data.toString());

      if (response.data && response.data.exception) {
        throw new Error(
          `Moodle API Error: ${response.data.message || 'Unknown error'}`,
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Moodle API call failed: ${error.message}`,
          error.response?.data,
        );
        throw new Error(
          `Failed to call Moodle API: ${error.response?.data?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Flatten nested parameters for Moodle API
   * Moodle expects parameters in format like: users[0][username]=john
   */
  private flattenParams(
    params: Record<string, any>,
    prefix: string = '',
  ): Record<string, string> {
    const flattened: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      const newKey = prefix ? `${prefix}[${key}]` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenParams(value, newKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            Object.assign(flattened, this.flattenParams(item, `${newKey}[${index}]`));
          } else {
            flattened[`${newKey}[${index}]`] = String(item);
          }
        });
      } else {
        flattened[newKey] = String(value);
      }
    }

    return flattened;
  }

  /**
   * Create a course in Moodle
   */
  async createCourse(
    config: MoodleConfig,
    courseData: {
      fullname: string;
      shortname: string;
      categoryid: number;
      summary?: string;
      format?: string;
    },
  ): Promise<MoodleApiResponse> {
    const params = {
      courses: [
        {
          fullname: courseData.fullname,
          shortname: courseData.shortname,
          categoryid: courseData.categoryid,
          summary: courseData.summary || '',
          format: courseData.format || 'topics',
        },
      ],
    };

    const result = await this.callMoodleApi(config, 'core_course_create_courses', params);
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Get course by shortname
   */
  async getCourseByShortname(
    config: MoodleConfig,
    shortname: string,
  ): Promise<MoodleApiResponse | null> {
    const params = {
      field: 'shortname',
      value: shortname,
    };

    const result = await this.callMoodleApi(
      config,
      'core_course_get_courses_by_field',
      params,
    );

    if (result && result.courses && result.courses.length > 0) {
      return result.courses[0];
    }

    return null;
  }

  /**
   * Get course categories
   */
  async getCourseCategories(config: MoodleConfig): Promise<MoodleApiResponse> {
    return this.callMoodleApi(config, 'core_course_get_categories');
  }

  /**
   * Create a user in Moodle
   */
  async createUser(
    config: MoodleConfig,
    userData: {
      username: string;
      password: string;
      firstname: string;
      lastname: string;
      email: string;
    },
  ): Promise<MoodleApiResponse> {
    const params = {
      users: [
        {
          username: userData.username,
          password: userData.password,
          firstname: userData.firstname,
          lastname: userData.lastname,
          email: userData.email,
          auth: 'manual',
        },
      ],
    };

    const result = await this.callMoodleApi(config, 'core_user_create_users', params);
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Enroll user in course
   */
  async enrollUser(
    config: MoodleConfig,
    enrollmentData: {
      userid: number;
      courseid: number;
      roleid?: number;
    },
  ): Promise<MoodleApiResponse> {
    const params = {
      enrolments: [
        {
          roleid: enrollmentData.roleid || 5,
          userid: enrollmentData.userid,
          courseid: enrollmentData.courseid,
        },
      ],
    };

    return this.callMoodleApi(config, 'enrol_manual_enrol_users', params);
  }
}
